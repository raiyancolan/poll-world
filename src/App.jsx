// App.jsx
import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot
} from 'firebase/firestore';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'firebase/auth';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDNOYQrmXqJjEzvtp28A-J2kXR1beFpreE",
  authDomain: "poll-hell.firebaseapp.com",
  projectId: "poll-hell",
  storageBucket: "poll-hell.firebasestorage.app",
  messagingSenderId: "39303946430",
  appId: "1:39303946430:web:ccb54ef9ec6f8df51e3eef",
  measurementId: "G-3L2ZEL8W4L"
};

// Firebase Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [poll, setPoll] = useState(null);
  const [choice, setChoice] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userDoc = doc(db, 'users', u.uid);
        const snap = await getDoc(userDoc);
        if (!snap.exists()) {
          await setDoc(userDoc, { role: 'user' });
          setRole('user');
        } else {
          setRole(snap.data().role);
        }
      } else {
        setUser(null);
        setRole(null);
      }
    });

    const unsubscribePoll = onSnapshot(doc(db, 'polls', 'active'), (docSnap) => {
      setPoll(docSnap.exists() ? docSnap.data() : null);
    });

    return () => {
      unsubscribeAuth();
      unsubscribePoll();
    };
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const createPoll = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const choices = e.target.choices.value.split(',').map((c) => c.trim());
    const date = new Date().toISOString();
    await setDoc(doc(db, 'polls', 'active'), {
      name,
      choices,
      date,
      votes: {}
    });
    e.target.reset();
  };

  const submitVote = async () => {
    if (!poll || !user || !choice) return;
    const pollRef = doc(db, 'polls', 'active');
    const pollSnap = await getDoc(pollRef);
    const data = pollSnap.data();

    if (data.votes[user.uid]) return; // already voted

    data.votes[user.uid] = {
      choice,
      name: user.displayName,
      email: user.email
    };

    await setDoc(pollRef, data);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Poll App</h1>
        {user ? (
          <button onClick={logout} className="text-blue-500">Logout</button>
        ) : (
          <button onClick={login} className="text-blue-500">Login with Google</button>
        )}
      </div>

      {user && role === 'admin' && (
        <form onSubmit={createPoll} className="mb-6">
          <h2 className="font-semibold mb-2">Create New Poll</h2>
          <input name="name" placeholder="Poll name" className="border p-2 mb-2 w-full" required />
          <input name="choices" placeholder="Choices (comma separated)" className="border p-2 mb-2 w-full" required />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2">Create</button>
        </form>
      )}

      {poll && (
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">{poll.name}</h2>
          <p className="text-sm mb-4 text-gray-500">{new Date(poll.date).toLocaleString()}</p>

          {user && poll.votes[user.uid] ? (
            <p className="text-green-600">
              You voted: <strong>{poll.votes[user.uid].choice}</strong>
            </p>
          ) : (
            <>
              {poll.choices.map((c) => (
                <div key={c} className="mb-2">
                  <label>
                    <input
                      type="radio"
                      name="choice"
                      value={c}
                      onChange={(e) => setChoice(e.target.value)}
                    />{' '}
                    {c}
                  </label>
                </div>
              ))}
              <button
                onClick={submitVote}
                disabled={!user}
                className="mt-2 bg-green-500 text-white px-4 py-2 disabled:opacity-50"
              >
                Vote
              </button>
            </>
          )}

          {user && role === 'admin' && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Votes:</h3>
              <ul className="text-sm text-gray-700">
                {Object.entries(poll.votes || {}).map(([uid, vote]) => (
                  <li key={uid}>
                    {vote.name} ({vote.email}): <strong>{vote.choice}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
