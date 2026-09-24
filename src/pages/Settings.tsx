import { useState, useEffect, useRef } from "react";
import { getSettings, updateSettings, uploadTrainingPlan, downloadTrainingPlanUrl } from "../lib/api";
import { Alert } from "@dotevolve/ui-kit";

export default function Settings() {
  const [trainingExpiry, setTrainingExpiry] = useState<number | "">("");
  const [brochureExpiry, setBrochureExpiry] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings: Record<string, any>) => {
        const tp = settings["training_plan_expiry_days"];
        const b = settings["brochure_expiry_days"];
        if (tp !== undefined) setTrainingExpiry(Number(tp));
        if (b !== undefined) setBrochureExpiry(Number(b));
      })
      .catch(() => {
        setMessage({ type: "error", text: "Failed to load settings." });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: {
        training_plan_expiry_days?: number;
        brochure_expiry_days?: number;
      } = {};
      if (trainingExpiry !== "")
        payload.training_plan_expiry_days = Number(trainingExpiry);
      if (brochureExpiry !== "")
        payload.brochure_expiry_days = Number(brochureExpiry);
      await updateSettings(payload);
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-semibold mb-6">Settings</h2>

      {message && (
        <div className="mb-6">
          <Alert
            variant={message.type === "error" ? "error" : "success"}
            title={message.type === "error" ? "Error" : "Success"}
            message={message.text}
          />
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white shadow rounded-lg p-6 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Training Plan Link Expiry (Days)
          </label>
          <input
            type="number"
            min="1"
            max="3650"
            required
            value={trainingExpiry}
            onChange={(e) =>
              setTrainingExpiry(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full border border-gray-300 rounded-md p-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Days until a downloaded training plan link expires.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brochure Link Expiry (Days)
          </label>
          <input
            type="number"
            min="1"
            max="3650"
            required
            value={brochureExpiry}
            onChange={(e) =>
              setBrochureExpiry(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full border border-gray-300 rounded-md p-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Days until a course brochure download link expires.
          </p>
        </div>

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-white shadow rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-medium">Training Plan Document</h3>
        <p className="text-sm text-gray-500">
          Upload a new master training plan document (PDF) to replace the
          existing one.
        </p>

        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 20 * 1024 * 1024) {
                window.alert("File size exceeds 20MB limit. Please upload a smaller file.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
              }
              setUploading(true);
              setMessage(null);
              try {
                await uploadTrainingPlan(file);
                setMessage({
                  type: "success",
                  text: "Training plan uploaded successfully!",
                });
              } catch (err: any) {
                setMessage({
                  type: "error",
                  text: err.message || "Failed to upload training plan.",
                });
              } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload New Plan"}
          </button>

          <button
            onClick={async () => {
              setDownloading(true);
              try {
                const signedUrl = await downloadTrainingPlanUrl();
                window.open(signedUrl, "_blank");
              } catch (err: any) {
                setMessage({
                  type: "error",
                  text: err.message || "Failed to download.",
                });
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {downloading ? "Generating link..." : "Download Current Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
