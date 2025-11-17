import { GoogleGenAI } from '@google/genai';
import { AspectRatio } from '../types'; // Removed AistudioWindow import
import { BILLING_DOCS_URL } from '../constants';

// Removed the explicit type cast, window.aistudio is now globally typed.
// const windowWithAistudio = window as AistudioWindow;

/**
 * Converts a File object to a Base64 string.
 * @param file The file to convert.
 * @returns A promise that resolves with the Base64 string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data:image/jpeg;base64, prefix
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a video from an image and an optional prompt using the Veo model.
 * Handles API key selection, polling for video generation, and fetching the final video.
 * @param imageFile The image file to animate.
 * @param prompt An optional text prompt for the video generation.
 * @param aspectRatio The desired aspect ratio for the video.
 * @returns A promise that resolves with the URL of the generated video blob.
 */
export async function generateVideoFromImage(
  imageFile: File,
  prompt: string,
  aspectRatio: AspectRatio,
): Promise<string> {
  // Use window.aistudio directly as the global Window interface is now augmented.
  if (!window.aistudio) {
    throw new Error('aistudio environment not found. Please ensure you are running in a compatible environment.');
  }

  // Check and prompt for API key selection
  let apiKeySelected = await window.aistudio.hasSelectedApiKey();
  if (!apiKeySelected) {
    console.log('No API key selected, opening selection dialog...');
    await window.aistudio.openSelectKey();
    // Assume selection was successful or handle potential re-check if needed.
    // For now, we assume success to avoid race conditions.
    apiKeySelected = true;
  }

  if (!process.env.API_KEY || !apiKeySelected) {
    throw new Error(`API Key is not configured. Please select your API key.
      See billing documentation: ${BILLING_DOCS_URL}`);
  }

  // CRITICAL: Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key from the dialog.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Image = await fileToBase64(imageFile);

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'An animated scene based on the image.',
      image: {
        imageBytes: base64Image,
        mimeType: imageFile.type,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p', // For veo-3.1-fast-generate-preview, 720p is often sufficient and faster
        aspectRatio: aspectRatio,
      },
    });

    // Poll until the operation is done
    while (!operation.done) {
      console.log('Video generation in progress... waiting 10 seconds.');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Failed to retrieve video download link from the operation response.');
    }

    console.log('Video generation complete. Fetching video...');
    // Append API key for fetching the video
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
      // Check for API key related errors
      const errorText = await response.text();
      if (response.status === 404 && errorText.includes("Requested entity was not found.")) {
          console.error("API key might be invalid or access denied. Please re-select your API key.");
          // Attempt to re-open the API key selection dialog
          if (window.aistudio) { // Use window.aistudio directly
            await window.aistudio.openSelectKey();
          }
          throw new Error('Video generation failed: Invalid API Key or resource not found. Please re-select your API key and try again.');
      }
      throw new Error(`Failed to fetch generated video: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}