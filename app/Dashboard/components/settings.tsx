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
    axios.get(`${API_URL}/get_current_user?user_id=1`)
      .then(response => {
        const userData = response.data as UserData;
        setName(userData.name);
        setEmail(userData.email);
        setPassword(userData.password);
      })
      .catch(() => setError("Failed to fetch user data"));
  }, []);


  const handleUpdate = async () => {
    setError("");
    setSuccess("");
    
    if (!name || !email) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/update_profile`, {
        id: 1, // Replace with actual user ID from session
        name,
        email
      });

      if (response.data.success) {
        setSuccess("Profile updated successfully");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.data.error || "Update failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "An error occurred during update");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto shadow-xl rounded-2xl border border-gray-200">
        <CardHeader className="bg-blue-50 rounded-t-2xl">
          <CardTitle className="text-3xl font-bold text-gray-800">
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-8 py-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl py-3 px-4 text-base focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}

            <Button
              onClick={handleUpdate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition-all"
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