"use client";

import { useState } from "react";

/**
 * Displays all handlers in a table with edit/delete actions.
 *
 * Props:
 *   handlers     — array of handler objects from MongoDB
 *   onEdit       — called with a handler when the Edit button is clicked
 *   onDeleted    — called with handler _id after successful delete
 *   loading      — true while handlers are being fetched
 */
export function HandlersTable({ handlers, onEdit, onDeleted, loading }) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/handlers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed.");
      }
      onDeleted(id);
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (loading) {
    return (
      <div className="handlers-section glass-panel">
        <div className="handlers-header">
          <h3>Page Handlers</h3>
        </div>
        <div className="loading-row">
          <div className="spinner" aria-hidden="true"></div>
          <p className="loading-text">Loading handlers&hellip;</p>
        </div>
      </div>
    );
  }

  if (!handlers || handlers.length === 0) {
    return (
      <div className="handlers-section glass-panel">
        <div className="handlers-header">
          <h3>Page Handlers</h3>
        </div>
        <p className="handlers-empty">
          No handlers registered yet. Add one using the button above or share the
          <a href="/register" className="handlers-register-link"> registration form</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="handlers-section glass-panel">
      <div className="handlers-header">
        <h3>Page Handlers</h3>
        <span className="handlers-count">{handlers.length} registered</span>
      </div>

      <div className="handlers-table-wrap">
        <table className="handlers-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Accounts</th>
              <th>Monthly Pay</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {handlers.map((h) => (
              <tr key={h._id}>
                <td className="handler-name-cell">{h.handlerName}</td>
                <td className="handler-phone-cell">
                  {h.countryCode} {h.phone}
                </td>
                <td className="handler-accounts-cell">
                  <div className="account-chips">
                    {h.accounts.map((a) => (
                      <span key={a} className="account-chip">@{a}</span>
                    ))}
                  </div>
                </td>
                <td className="handler-pay-cell">
                  {h.currency}{h.monthlyPay?.toLocaleString()}
                </td>
                <td className="handler-actions-cell">
                  {confirmId === h._id ? (
                    <div className="confirm-row">
                      <span className="confirm-text">Delete?</span>
                      <button
                        type="button"
                        className="confirm-yes"
                        onClick={() => handleDelete(h._id)}
                        disabled={deletingId === h._id}
                      >
                        {deletingId === h._id ? "…" : "Yes"}
                      </button>
                      <button
                        type="button"
                        className="confirm-no"
                        onClick={() => setConfirmId(null)}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="action-row">
                      <button
                        type="button"
                        className="action-btn edit-btn"
                        onClick={() => onEdit(h)}
                        title="Edit handler"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn delete-btn"
                        onClick={() => setConfirmId(h._id)}
                        title="Delete handler"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
