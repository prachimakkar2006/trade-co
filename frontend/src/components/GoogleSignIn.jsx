import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext.jsx';

export default function GoogleSignIn({ onError, onSuccess }) {
  const { loginWithGoogle } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div className="google-button">
      <GoogleLogin
        onSuccess={async ({ credential }) => {
          try {
            await loginWithGoogle(credential);
            onSuccess?.();
          } catch (error) {
            const message = error.response?.data?.message || (
              error.code === 'ERR_NETWORK'
                ? 'Cannot reach the tread&co server. Start the backend and make sure MongoDB Atlas connects, then try again.'
                : 'Google sign-in failed. Please try again.'
            );
            onError(message);
          }
        }}
        onError={() => onError('Google sign-in was cancelled or could not be completed.')}
        theme="outline"
        shape="rectangular"
        width="360"
        text="continue_with"
      />
    </div>
  );
}
