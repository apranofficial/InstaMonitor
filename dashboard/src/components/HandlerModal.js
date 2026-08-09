"use client";

import { useState } from "react";

/**
 * Reusable modal for creating or editing a handler.
 *
 * Props:
 *   handler  — existing handler object to edit, or null for create mode
 *   onClose  — called when the modal is dismissed
 *   onSaved  — called with the saved handler after a successful create/update
 */
export function HandlerModal({ handler, onClose, onSaved }) {
  const isEdit = Boolean(handler);

  const [handlerName, setHandlerName] = useState(handler?.handlerName || "");
  const [countryCode, setCountryCode] = useState(handler?.countryCode || "+91");
  const [phone, setPhone] = useState(handler?.phone || "");
  const [accounts, setAccounts] = useState(
    handler?.accounts?.length ? [...handler.accounts] : [""]
  );
  const [currency, setCurrency] = useState(handler?.currency || "₹");
  const [monthlyPay, setMonthlyPay] = useState(
    handler?.monthlyPay?.toString() || ""
  );

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const COUNTRY_CODES = [
    { code: "+91", label: "IN +91" },
    { code: "+1", label: "US +1" },
    { code: "+44", label: "UK +44" },
    { code: "+61", label: "AU +61" },
    { code: "+971", label: "AE +971" },
  ];

  const addAccount = () => setAccounts((prev) => [...prev, ""]);
  const removeAccount = (i) => setAccounts((prev) => prev.filter((_, idx) => idx !== i));
  const updateAccount = (i, val) =>
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? val : a)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setServerError("");
    setErrors({});

    const payload = {
      handlerName: handlerName.trim(),
      countryCode,
      phone: phone.replace(/[\s-]/g, ""),
      accounts: accounts.map((a) => a.trim().replace(/^@/, "")),
      monthlyPay: Number(monthlyPay),
      currency,
    };

    try {
      const url = isEdit ? `/api/handlers/${handler._id}` : "/api/handlers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        throw new Error(json.error || "Request failed.");
      }

      onSaved(json.handler);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit Handler" : "Add Handler"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="modal-form">
          {/* Handler Name */}
          <div className="modal-field">
            <label htmlFor="modal-name" className="modal-label">Name</label>
            <input
              id="modal-name"
              type="text"
              className="modal-input"
              placeholder="Handler's full name"
              value={handlerName}
              onChange={(e) => setHandlerName(e.target.value)}
            />
            {errors.handlerName && <p className="modal-error">{errors.handlerName}</p>}
          </div>

          {/* Phone */}
          <div className="modal-field">
            <label htmlFor="modal-phone" className="modal-label">Phone</label>
            <div className="modal-row">
              <select
                className="modal-input modal-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                id="modal-phone"
                type="tel"
                inputMode="numeric"
                className="modal-input"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {errors.phone && <p className="modal-error">{errors.phone}</p>}
          </div>

          {/* Instagram Accounts */}
          <div className="modal-field">
            <span className="modal-label">Instagram Accounts</span>
            <div className="modal-accounts">
              {accounts.map((username, i) => (
                <div key={i} className="modal-account-row">
                  <span className="modal-at">@</span>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="username"
                    value={username}
                    onChange={(e) => updateAccount(i, e.target.value)}
                  />
                  {i > 0 && (
                    <button
                      type="button"
                      className="modal-remove-btn"
                      onClick={() => removeAccount(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="modal-add-btn" onClick={addAccount}>
              + Add Account
            </button>
            {errors.accounts && <p className="modal-error">{errors.accounts}</p>}
          </div>

          {/* Monthly Pay */}
          <div className="modal-field">
            <label htmlFor="modal-pay" className="modal-label">Monthly Pay</label>
            <div className="modal-row">
              <select
                className="modal-input modal-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
              </select>
              <input
                id="modal-pay"
                type="number"
                min="1"
                step="1"
                className="modal-input"
                placeholder="Amount"
                value={monthlyPay}
                onChange={(e) => setMonthlyPay(e.target.value)}
              />
            </div>
            {errors.monthlyPay && <p className="modal-error">{errors.monthlyPay}</p>}
          </div>

          {serverError && (
            <div className="modal-server-error">{serverError}</div>
          )}

          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Handler"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
