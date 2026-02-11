/**
 * App
 *
 * Root application component with RouterProvider.
 * Initializes auth on mount so AuthGuard can gate protected routes.
 */

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '@stores/authStore';

function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return <RouterProvider router={router} />;
}

export default App;
