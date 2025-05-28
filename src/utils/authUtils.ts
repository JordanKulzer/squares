// import * as Google from 'expo-auth-session/providers/google';
// import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
// import { auth } from '../../firebaseConfig';
// import * as WebBrowser from 'expo-web-browser';
// import { useEffect } from 'react';

// WebBrowser.maybeCompleteAuthSession();

// export const useGoogleLogin = () => {
//   const [request, response, promptAsync] = Google.useAuthRequest({
//     expoClientId: 'YOUR_EXPO_CLIENT_ID',
//     iosClientId: 'YOUR_IOS_CLIENT_ID',
//     androidClientId: 'YOUR_ANDROID_CLIENT_ID',
//     webClientId: 'YOUR_WEB_CLIENT_ID',
//   });

//   useEffect(() => {
//     if (response?.type === 'success') {
//       const { id_token } = response.authentication;
//       const credential = GoogleAuthProvider.credential(id_token);
//       signInWithCredential(auth, credential).catch((err) =>
//         console.log('Google sign-in error:', err)
//       );
//     }
//   }, [response]);

//   return { promptAsync };
// };
