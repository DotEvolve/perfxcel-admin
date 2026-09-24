import { useState, useEffect } from "react";
import { getSettings, updateSetting } from "../lib/api";
import { Alert } from "@dotevolve/ui-kit";

export default function Settings() {
  const [trainingExpiry, setTrainingExpiry] = useState<number | "">("");
  const [brochureExpiry, setBrochureExpiry] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getSettings().then((settings: any) => {
      const tp = settings.find((s: any) => s.setting_key === "training_plan_expiry_days")?.setting_value;
      const b = settings.find((s: any) => s.setting_key === "brochure_expiry_days")?.setting_value;
      if (tp) setTrainingExpiry(Number(tp));
      if (b) setBrochureExpiry(Number(b));
    }).catch(() => {
      setMessage({ type: "error", text: "Failed to load settings." });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (trainingExpiry) await updateSetting("training_plan_expiry_days", String(trainingExpiry));
      if (brochureExpiry) await updateSetting("brochure_expiry_days", String(brochureExpiry));
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save settings." });
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
          <Alert variant={message.type === 'error' ? 'error' : 'success'} title={message.type === 'error' ? 'Error' : 'Success'} message={message.text} />
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white shadow rounded-lg p-6 space-y-6">
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
            onChange={(e) => setTrainingExpiry(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-gray-300 rounded-md p-2"
          />
          <p className="mt-1 text-xs text-gray-500">Days until a downloaded training plan link expires.</p>
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
            onChange={(e) => setBrochureExpiry(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-gray-300 rounded-md p-2"
          />
          <p className="mt-1 text-xs text-gray-500">Days until a course brochure download link expires.</p>
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
    </div>
  );
}
