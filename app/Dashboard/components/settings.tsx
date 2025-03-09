// settings.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/Dashboard/ui/card";
import { Input } from "@/app/Dashboard/ui/input";
import { Button } from "@/app/Dashboard/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface UserData {
  name: string;
  email: string;
  password: string;
}

const Settings = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/get_current_user`)
      .then(response => {
        const userData = response.data as UserData;
        setName(userData.name);
        setEmail(userData.email);
        setPassword(userData.password);
      })
      .catch(() => setError("Failed to fetch user data"));
  }, []);

  const handleUpdate = async () => {
    try {
      const response = await axios.post(`${API_URL}/update_profile`, { 
        id: 1, // Replace with actual user ID from session
        name, 
        email 
      });
      
      if ((response.data as { success: boolean }).success) {
        setSuccess("Profile updated successfully");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError("Update failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <div className="space-y-4">
            <div>
              <label>Full Name:</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg py-2 px-4"
              />
            </div>
            <div>
              <label>Email:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg py-2 px-4"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <Button 
              onClick={handleUpdate}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-all"
            >
              Update Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;