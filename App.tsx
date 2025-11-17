import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVideoFromImage } from './services/geminiService';
import { AspectRatio } from './types'; // Removed AistudioWindow import
import { BILLING_DOCS_URL } from './constants';

const App: React.FC = () => {
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SIXTEEN_NINE);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState<boolean | null>(null);

  // Removed the explicit type cast, window.aistudio is now globally typed.
  // const windowWithAistudio = window as AistudioWindow;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKeyStatus = useCallback(async () => {
    // Use window.aistudio directly as the global Window interface is now augmented.
    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      } catch (e) {
        console.error('Error checking API key status:', e);
        setApiKeySelected(false); // Assume false if there's an error checking
      }
    } else {
      setApiKeySelected(false); // No aistudio environment detected
    }
  }, []); // Dependency array updated: window is global, no need to include window.aistudio

  useEffect(() => {
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setGeneratedVideoUrl(null);
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setError('Please upload a valid image file (e.g., JPG, PNG).');
    }
  }, []);

  const handleOpenApiKeySelection = useCallback(async () => {
    setError(null);
    // Use window.aistudio directly as the global Window interface is now augmented.
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setApiKeySelected(true); // Assume success after opening dialog
      } catch (e) {
        console.error('Error opening API key selection:', e);
        setError('Failed to open API key selection dialog.');
      }
    } else {
      setError('aistudio environment not available to select API key.');
    }
  }, []); // Dependency array updated: window is global

  const handleGenerateVideo = useCallback(async () => {
    if (!selectedImageFile) {
      setError('Please upload an image first.');
      return;
    }
    // API Key status check for UI display. The service function will also handle re-checking and prompting.
    if (apiKeySelected === false) {
        setError(
          `API Key is not configured. Please click "Select API Key" below.
          See billing documentation: ${BILLING_DOCS_URL}`
        );
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);

    try {
      const videoUrl = await generateVideoFromImage(selectedImageFile, prompt, aspectRatio);
      setGeneratedVideoUrl(videoUrl);
      console.log('Video generated and displayed.');
    } catch (err: any) {
      console.error('Video generation failed:', err);
      let errorMessage = 'An unexpected error occurred during video generation.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Specific check for API key related errors after generation attempt
      if (errorMessage.includes("API Key is not configured") || errorMessage.includes("Invalid API Key")) {
        // If an API key error occurs, reset API key status and attempt to re-open the selection dialog.
        setApiKeySelected(false); // Reset API key status to false
        if (window.aistudio) {
            window.aistudio.openSelectKey();
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedImageFile, prompt, aspectRatio, apiKeySelected]); // Dependency array updated: window.aistudio removed

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm shadow-xl rounded-lg p-6 md:p-8 w-full max-w-4xl space-y-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gradient-to-r from-blue-400 to-purple-600 mb-2">
          Veo Image Animator
        </h1>
        <p className="text-center text-gray-300 mb-8 text-lg">
          Upload a photo and let Gemini Veo bring it to life with animation!
        </p>

        {/* API Key Status / Selection */}
        {apiKeySelected === false && (
          <div className="bg-red-600/30 border border-red-500 text-red-100 p-4 rounded-md text-center">
            <p className="font-semibold mb-2">API Key Not Selected</p>
            <p className="mb-4">
              A Google API Key is required to use Veo video generation. Please select your key to continue.
            </p>
            <button
              onClick={handleOpenApiKeySelection}
              className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Select API Key
            </button>
            <p className="mt-4 text-sm">
              <a href={BILLING_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-200">
                Billing documentation
              </a>
            </p>
          </div>
        )}

        {/* Image Upload Section */}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-gray-100">1. Upload Your Image</h2>
            <label
              htmlFor="image-upload"
              className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-500 rounded-lg cursor-pointer bg-purple-700/20 hover:bg-purple-600/30 transition duration-300"
            >
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <p className="mt-2 text-sm text-purple-200">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-purple-300">PNG, JPG up to 10MB</p>
              </div>
              <input
                id="image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isLoading}
              />
            </label>
            {imagePreviewUrl && (
              <div className="mt-4 rounded-lg overflow-hidden border border-purple-600">
                <img src={imagePreviewUrl} alt="Image preview" className="w-full h-auto object-cover max-h-64" />
                <p className="p-2 text-sm text-gray-300 text-center bg-purple-800/50">{selectedImageFile?.name}</p>
              </div>
            )}
            {!imagePreviewUrl && selectedImageFile && (
              <p className="text-red-400 text-center">Invalid file type selected.</p>
            )}
          </div>

          {/* Video Settings Section */}
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold text-gray-100">2. Configure Animation</h2>
            <div>
              <label htmlFor="prompt" className="block text-gray-200 text-sm font-bold mb-2">
                Prompt (Optional):
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the desired animation (e.g., 'Make it look like a sci-fi landscape', 'Add subtle movements to the water')."
                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-800/50 border-purple-600 text-gray-100 placeholder-gray-400"
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-gray-200 text-sm font-bold mb-2">
                Aspect Ratio:
              </label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-purple-500 h-5 w-5"
                    name="aspectRatio"
                    value={AspectRatio.SIXTEEN_NINE}
                    checked={aspectRatio === AspectRatio.SIXTEEN_NINE}
                    onChange={() => setAspectRatio(AspectRatio.SIXTEEN_NINE)}
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-gray-200">16:9 (Landscape)</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-purple-500 h-5 w-5"
                    name="aspectRatio"
                    value={AspectRatio.NINE_SIXTEEN}
                    checked={aspectRatio === AspectRatio.NINE_SIXTEEN}
                    onChange={() => setAspectRatio(AspectRatio.NINE_SIXTEEN)}
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-gray-200">9:16 (Portrait)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button - Sticky Footer */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/10 backdrop-blur-md rounded-b-lg flex justify-center z-10">
          <button
            onClick={handleGenerateVideo}
            className={`px-8 py-3 rounded-full text-lg font-bold transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 ${
              !selectedImageFile || isLoading || apiKeySelected === false
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-700 hover:from-blue-600 hover:to-purple-800 text-white shadow-lg'
            }`}
            disabled={!selectedImageFile || isLoading || apiKeySelected === false}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Video... (This may take a few minutes)
              </span>
            ) : (
              'Animate Image with Veo'
            )}
          </button>
        </div>


        {/* Result & Error Display */}
        {error && (
          <div className="bg-red-600/30 border border-red-500 text-red-100 p-4 rounded-md text-center mt-8">
            <p className="font-semibold mb-2">Error!</p>
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {generatedVideoUrl && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">Your Animated Video</h2>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl border border-purple-500">
              <video
                src={generatedVideoUrl}
                controls
                loop
                autoPlay
                className="w-full h-full object-contain bg-black"
                onEnded={() => { /* Optionally loop or play next */ }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <p className="text-center text-gray-400 text-sm mt-4">
              Tip: The generated video will loop automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;