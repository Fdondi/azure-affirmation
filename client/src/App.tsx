import React, { useState, useEffect } from 'react';
import './App.css';

interface AffirmationResponse {
  line: string;
  version: string;
}

interface UserInfo {
  userDetails: string;
  userRoles: string[];
  claims: any[];
  identityProvider: string;
}

function App() {
  const [affirmation, setAffirmation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Configuration - Use external Function App (Free Static Web Apps tier doesn't support co-located functions)
  const AZURE_FUNCTION_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:7071/api/getRandomLine'  // Local development
    : 'https://affirmations-flex-ckbsdqhwhqcbd4gb.northeurope-01.azurewebsites.net/api/getRandomLine';  // Production (external Function App)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/.auth/me');
        if (response.ok) {
          const authData = await response.json();
          if (authData.clientPrincipal) {
            setUser(authData.clientPrincipal);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (provider: string) => {
    window.location.href = `/.auth/login/${provider}`;
  };

  const handleLogout = () => {
    window.location.href = '/.auth/logout';
  };

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

  if (isCheckingAuth) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading show">
            <div className="spinner"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <div className="container">
          <h1>Daily Affirmations</h1>
          <div className="affirmation-display">
            <div className="affirmation-text show placeholder-text">
              Please log in to access your daily affirmations ✨
            </div>
          </div>
          
          <div className="auth-buttons">
            <button 
              className="get-affirmation-btn" 
              onClick={() => handleLogin('github')}
              style={{ marginRight: '10px' }}
            >
              Login with GitHub
            </button>
            <button 
              className="get-affirmation-btn" 
              onClick={() => handleLogin('google')}
              style={{ backgroundColor: '#db4437', marginRight: '10px' }}
            >
              Login with Google
            </button>
            <button 
              className="get-affirmation-btn" 
              onClick={() => handleLogin('aad')}
              style={{ backgroundColor: '#0078d4' }}
            >
              Login with Microsoft
            </button>
          </div>

          <div className="footer">
            <p>Powered by Azure Functions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="container">
        <div className="user-info">
          <span>Welcome, {user.userDetails}!</span>
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            style={{
              marginLeft: '15px',
              padding: '5px 15px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

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
