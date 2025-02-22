import React, { useEffect, useState } from "react";
import { getStatus } from "../services/authService";

function Home() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getStatus();
        setStatus(data);
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching status");
      }
    };

    fetchStatus();
  }, []);

  return (
    <div>
      <h2>Status</h2>
      {error ? (
        <p>Error: {error}</p>
      ) : status ? (
        <div>
          <p>UserId: {status.userId}</p>
          <p>Full Name: {status.fullName}</p>
          <p>Email: {status.email}</p>
          <p>Role: {status.role}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default Home;
