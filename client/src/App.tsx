import React, { useState } from 'react';
import './App.css';

interface AffirmationResponse {
  line: string;
  version: string;
}

function App() {
  const [affirmation, setAffirmation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Configuration - Use external Function App for now (debugging Static Web Apps integration)
  const AZURE_FUNCTION_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:7071/api/getRandomLine'  // Local development
    : 'https://affirmations.azurewebsites.net/api/getRandomLine';  // Production (external Function App)

  const getAffirmation = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Add a small delay to show loading animation
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await fetch(AZURE_FUNCTION_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AffirmationResponse = await response.json();
      
      if (data.line) {
        setAffirmation(data.line);
      } else {
        throw new Error('No affirmation received');
      }

    } catch (error: any) {
      console.error('Error fetching affirmation:', error);
      
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Unable to connect to the server. Make sure your Azure Function is running.' 
        : 'Something went wrong. Please try again.';
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isLoading) {
      event.preventDefault();
      getAffirmation();
    }
  };

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="container">
        <h1>Daily Affirmations</h1>
        
        <div className="affirmation-display">
          <div className={`affirmation-text show ${!affirmation ? 'placeholder-text' : ''}`}>
            {affirmation 
              ? `"${affirmation}"`
              : 'Click the button below to get your daily affirmation ✨'
            }
          </div>
        </div>

        {isLoading && (
          <div className="loading show">
            <div className="spinner"></div>
            <p>Getting your affirmation...</p>
          </div>
        )}

        {error && (
          <div className="error-message show">
            <strong>Oops!</strong> {error}
          </div>
        )}

        <button 
          className="get-affirmation-btn" 
          onClick={getAffirmation}
          disabled={isLoading}
        >
          Get Affirmation
        </button>

        <div className="footer">
          <p>Powered by Azure Functions</p>
        </div>
      </div>
    </div>
  );
}

export default App;
