"use client";
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./style.css";
import Button from "@/components/Button";

export default function AIVideoQueryPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  const [voiceId, setVoiceId] = useState("TxGEqnHWrfWFTfGW9XjX"); // default
  const [audioUrl, setAudioUrl] = useState<string | null>(null);


  const generateVoice = async (text: string) => {
    try {
      const res = await fetch("/api/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType?.includes("audio")) {
        const error = await res.text();
        console.error("Failed audio fetch:", error);
        return;
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      setAudioUrl(audioUrl);
    } catch (err) {
      console.error("Voiceover generation failed:", err);
    }
  };





  useEffect(() => {
    const fetchRemoteHistory = async () => {
      try {
        const res = await fetch("/api/query-history");
        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Unexpected response format");
        }
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("❌ Failed to load history:", err);
      }
    };

    fetchRemoteHistory();
  }, []);

  const saveToHistory = (entry: any) => {
    const newHistory = [{ query, ...entry, timestamp: new Date().toISOString() }, ...history];
    setHistory(newHistory);
    localStorage.setItem("video-query-history", JSON.stringify(newHistory));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/ai-video-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Unexpected response format");
      }

      const data = await res.json();
      setResponse(data);
      saveToHistory(data);
    } catch (err) {
      console.error("❌ Failed to submit query:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <h1 className="title">🎥 Ask Mistral for Trending YouTube Videos</h1>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          className="textarea"
          placeholder='e.g. "Show me 20 trending videos this week in the US"'
        />

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Thinking..." : "Submit"}
        </Button>

        {!loading && response?.query?.count > 50 && (
          <div className="warning">
            <strong>⚠️ Heads up:</strong>
            <p>
              You requested <strong>{response.query.count}</strong> videos, but YouTube’s API only returns up to <strong>50</strong>.
              We show all we can and filter locally for your category.
            </p>
          </div>
        )}

        {response?.summary && (
          <div className="markdownSummary">
            <h2>🧠 Summary of the Trend</h2>
            <ReactMarkdown>{response.summary}</ReactMarkdown>

            <div className="voiceControls">
              <label htmlFor="voice-select" className="voiceLabel">Select Voice:</label>
              <select
                id="voice-select"
                className="voiceSelect"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              >
                <option value="TxGEqnHWrfWFTfGW9XjX">Native American Male</option>
                <option value="21m00Tcm4TlvDq8ikWAM">African American Male</option>
                <option value="EXAVITQu4vr4xnSDxMaL">White Female</option>
                <option value="MF3mGyEYCl7XYWbV9V6O">British Male</option>
              </select>

              <Button onClick={() => generateVoice(response.summary)}>🔊 Generate Voiceover</Button>

              {audioUrl && (
                <div style={{ marginTop: 12 }}>
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: "100%", display: "block", backgroundColor: "#eee" }}
                  />

                </div>
              )}

            </div>
          </div>
        )}


        {response?.results && (
          <div style={{ marginTop: 40 }}>
            <h2 className="subheading">📺 Trending Videos</h2>
            <div className="grid">
              {response.results.map((video: any) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card"
                >
                  <img
                    src={video.thumbnail || video.snippet?.thumbnails?.medium?.url}
                    alt={`Thumbnail for "${video.title || video.snippet?.title || "a video"}"`}
                    className="thumbnail"
                    onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                  />

                  <h3 className="videoTitle">
                    {video.title || video.snippet?.title || "Untitled Video"}
                  </h3>
                  <p className="channel">
                    {video.channel || video.snippet?.channelTitle || "Unknown Channel"}
                  </p>
                </a>

              ))}
            </div>
          </div>
        )}

        {response?.error && (
          <div className="error">
            <p>❌ Error: {response.error}</p>
            <pre>{JSON.stringify(response.raw, null, 2)}</pre>
          </div>
        )}

        <div style={{ marginTop: 60 }}>
          <Button onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? "Hide History" : "Show History"}
          </Button>

          {showHistory && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 10 }}>🕒 Query History</h3>
              {history.length === 0 ? (
                <p>No previous queries yet.</p>
              ) : (
                <>
                  {paginatedHistory.map((item, index) => (
                    <div key={index} className="historyItem">
                      <p>
                        <strong>Prompt:</strong>{" "}
                        {typeof item.query === "object"
                          ? `${item.query.count} trending ${item.query.category} videos in ${item.query.region} (${item.query.timeframe})`
                          : item.query}
                      </p>
                      <ReactMarkdown>{item.summary}</ReactMarkdown>
                      <hr style={{ margin: "16px 0" }} />
                    </div>
                  ))}

                  <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      ◀ Prev
                    </button>
                    <span style={{ margin: "0 12px" }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                      Next ▶
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
