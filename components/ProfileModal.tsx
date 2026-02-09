import React, { useState } from 'react';
import { AcademicLevel, AppUser } from '../types';
import { updateUserProfile } from '../services/authService';
import { X } from 'lucide-react';

interface Props {
  user: AppUser;
  onClose: () => void;
  onUpdated: (user: AppUser) => void;
}

const ProfileModal: React.FC<Props> = ({ user, onClose, onUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      const updated = updateUserProfile(user.id, {
        fullName: String(formData.get('fullName') || '').trim(),
        department: String(formData.get('department') || '').trim(),
        academicLevel: formData.get('academicLevel') as AcademicLevel,
        headline: String(formData.get('headline') || '').trim(),
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Profile Settings</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-slate-500">Full Name</label>
            <input
              name="fullName"
              defaultValue={user.fullName}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Department</label>
            <input
              name="department"
              defaultValue={user.department || ''}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Academic Level</label>
            <select
              name="academicLevel"
              defaultValue={user.academicLevel || AcademicLevel.UG}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            >
              {Object.values(AcademicLevel).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Headline</label>
            <input
              name="headline"
              defaultValue={user.headline || ''}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
