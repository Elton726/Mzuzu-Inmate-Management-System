/**
 * Main Entry Point for MIMS Frontend Application
 *
 * This file serves as the root of the React application, responsible for:
 * - Initializing the React application with React 18's createRoot API
 * - Importing global styles and third-party CSS
 * - Rendering the main App component within StrictMode for development checks
 *
 * The application follows a modular architecture with:
 * - Context providers for global state (Auth, Toast)
 * - Client-side routing with React Router
 * - Tailwind CSS for styling with custom Malawi theme
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import App from './App.jsx'
import { store } from './store/store'

// Mount the React application to the DOM element with id 'root'
// StrictMode enables additional development checks and warnings
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
