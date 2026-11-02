"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
    const [recording, setRecording] = useState(false);
    const [videoURL, setVideoURL] = useState<string | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [uploading, setUploading] = useState(false);

    // Participant token
    const [token, setToken] = useState("");

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });

            // Show live camera
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            const recorder = new MediaRecorder(stream);

            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: "video/webm",
                });

                setVideoBlob(blob);

                const url = URL.createObjectURL(blob);
                setVideoURL(url);

                // Stop camera and microphone
                stream.getTracks().forEach((track) => track.stop());

                // Remove live camera
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            };

            recorder.start();
            setRecording(true);

        } catch (error) {
            console.error("Camera/microphone error:", error);
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setRecording(false);
    };

    const publishStory = async () => {
        if (!videoBlob) {
            alert("No video to upload.");
            return;
        }

        // Temporary token check
        if (!token.trim()) {
            alert("Please enter your participant token.");
            return;
        }

        try {
            setUploading(true);

            const fileName = `story-${Date.now()}.webm`;

            console.log("Uploading:", fileName);
            console.log("Participant token:", token);

            const { data, error } = await supabase.storage
                .from("stories")
                .upload(fileName, videoBlob, {
                    contentType: "video/webm",
                    upsert: false,
                });

            if (error) {
                console.error("Upload error:", error);
                alert(`Upload failed: ${error.message}`);
                return;
            }

            console.log("Upload successful:", data);

            // Get public URL
            const { data: publicURL } = supabase.storage
                .from("stories")
                .getPublicUrl(fileName);

            console.log("Video URL:", publicURL.publicUrl);

            alert("Your story has been published!");

        } catch (error) {
            console.error("Something went wrong:", error);
            alert("Something went wrong while uploading.");

        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-8">

            {/* PARTICIPANT TOKEN */}
            {!recording && !videoURL && (
                <div className="flex w-full max-w-lg flex-col gap-2">
                    <label
                        htmlFor="token"
                        className="text-sm font-medium text-gray-700"
                    >
                        Participant Token
                    </label>

                    <input
                        id="token"
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Enter your participant token"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                </div>
            )}

            {/* LIVE CAMERA */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full max-w-lg rounded-lg ${
                    recording ? "block" : "hidden"
                }`}
            />

            {/* RECORD BUTTON */}
            {!recording ? (
                <button
                    type="button"
                    onClick={startRecording}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
                >
                    🎥 Record Your Story
                </button>
            ) : (
                <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
                >
                    ⏹ Stop Recording
                </button>
            )}

            {/* RECORDED VIDEO */}
            {videoURL && (
                <div className="mt-6 flex w-full max-w-lg flex-col gap-4">

                    <h2 className="text-lg font-semibold">
                        Your Story
                    </h2>

                    <video
                        src={videoURL}
                        controls
                        className="w-full rounded-lg"
                    />

                    {/* PUBLISH */}
                    <button
                        type="button"
                        onClick={publishStory}
                        disabled={uploading}
                        className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {uploading
                            ? "Uploading..."
                            : "🚀 Publish Story"}
                    </button>

                </div>
            )}
        </div>
    );
}