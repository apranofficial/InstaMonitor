"use client";

import { useState } from "react";
import styles from "./register.module.css";

const COUNTRY_CODES = [
  { code: "+91", label: "IN +91" },
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+61", label: "AU +61" },
  { code: "+971", label: "AE +971" },
];

const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

function validateForm({ handlerName, phone, accounts, monthlyPay }) {
  const errors = { accounts: {} };

  if (!handlerName.trim()) {
    errors.handlerName = "Please enter your full name.";
  }

  const digits = phone.replace(/[\s-]/g, "");
  if (!digits) {
    errors.phone = "Phone number is required.";
  } else if (!/^\d+$/.test(digits)) {
    errors.phone = "Phone number must contain digits only.";
  } else if (digits.length < 10 || digits.length > 15) {
    errors.phone = "Phone number must be 10-15 digits.";
  }

  const cleaned = accounts.map((a) => a.trim().replace(/^@/, "").toLowerCase());
  const seen = new Map();
  cleaned.forEach((username, i) => {
    if (!username) {
      errors.accounts[i] = "Username is required.";
    } else if (!USERNAME_REGEX.test(username)) {
      errors.accounts[i] = "Only letters, numbers, dots and underscores allowed.";
    } else if (seen.has(username)) {
      errors.accounts[i] = "This username is already added above.";
    } else {
      seen.set(username, i);
    }
  });

  const pay = Number(monthlyPay);
  if (monthlyPay === "" || !Number.isFinite(pay) || pay <= 0) {
    errors.monthlyPay = "Enter a valid monthly pay amount.";
  }

  const hasErrors =
    errors.handlerName ||
    errors.phone ||
    errors.monthlyPay ||
    Object.keys(errors.accounts).length > 0;

  return { errors, valid: !hasErrors };
}

export default function RegisterPage() {
  const [handlerName, setHandlerName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState([""]);
  const [currency, setCurrency] = useState("₹");
  const [monthlyPay, setMonthlyPay] = useState("");

  const [errors, setErrors] = useState({ accounts: {} });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [serverError, setServerError] = useState("");

  const addAccount = () => setAccounts((prev) => [...prev, ""]);

  const removeAccount = (index) =>
    setAccounts((prev) => prev.filter((_, i) => i !== index));

  const updateAccount = (index, value) =>
    setAccounts((prev) => prev.map((a, i) => (i === index ? value : a)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: nextErrors, valid } = validateForm({
      handlerName,
      phone,
      accounts,
      monthlyPay,
    });
    setErrors(nextErrors);
    if (!valid) return;

    setStatus("submitting");
    setServerError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handlerName: handlerName.trim(),
          countryCode,
          phone: phone.replace(/[\s-]/g, ""),
          accounts: accounts.map((a) => a.trim().replace(/^@/, "")),
          monthlyPay: Number(monthlyPay),
          currency,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Submission failed (${res.status})`);
      }

      setStatus("success");
    } catch (err) {
      setServerError(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <main className={styles.page}>
        <div className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.checkWrap} aria-hidden="true">
            <svg viewBox="0 0 52 52" className={styles.checkSvg}>
              <circle className={styles.checkCircle} cx="26" cy="26" r="24" fill="none" />
              <path className={styles.checkMark} fill="none" d="M14 27l8 8 16-17" />
            </svg>
          </div>
          <h1 className={styles.successTitle}>Registration submitted successfully!</h1>
          <p className={styles.successText}>
            {"Thank you, "}
            {handlerName.trim()}
            {". We've recorded your details and will be in touch soon."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.cardHeader}>
          <div className={styles.brandMark} aria-hidden="true" />
          <h1 className={styles.title}>Page Handler Registration</h1>
          <p className={styles.subtitle}>
            Tell us who you are and which Instagram pages you manage.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="handlerName" className={styles.label}>
              Handler Name
            </label>
            <input
              id="handlerName"
              type="text"
              className={styles.input}
              placeholder="Your full name"
              value={handlerName}
              onChange={(e) => setHandlerName(e.target.value)}
              aria-invalid={!!errors.handlerName}
            />
            {errors.handlerName && (
              <p className={styles.fieldError} role="alert">{errors.handlerName}</p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>
              Phone Number
            </label>
            <div className={styles.phoneRow}>
              <select
                aria-label="Country code"
                className={`${styles.input} ${styles.codeSelect}`}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                className={styles.input}
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!errors.phone}
              />
            </div>
            {errors.phone && (
              <p className={styles.fieldError} role="alert">{errors.phone}</p>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Instagram Accounts</span>
            <div className={styles.accountList}>
              {accounts.map((username, i) => (
                <div key={i} className={styles.accountRow}>
                  <div className={styles.accountInputWrap}>
                    <span className={styles.atPrefix} aria-hidden="true">@</span>
                    <input
                      type="text"
                      aria-label={`Instagram username ${i + 1}`}
                      className={`${styles.input} ${styles.accountInput}`}
                      placeholder="username"
                      value={username}
                      onChange={(e) => updateAccount(i, e.target.value)}
                      aria-invalid={!!errors.accounts[i]}
                    />
                    {i > 0 && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeAccount(i)}
                        aria-label={`Remove account ${i + 1}`}
                      >
                        {"\u2715"}
                      </button>
                    )}
                  </div>
                  {errors.accounts[i] && (
                    <p className={styles.fieldError} role="alert">{errors.accounts[i]}</p>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className={styles.addBtn} onClick={addAccount}>
              {"+ Add Account"}
            </button>
          </div>

          <div className={styles.field}>
            <label htmlFor="monthlyPay" className={styles.label}>
              Monthly Pay
            </label>
            <div className={styles.phoneRow}>
              <select
                aria-label="Currency"
                className={`${styles.input} ${styles.codeSelect}`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
              </select>
              <input
                id="monthlyPay"
                type="number"
                min="1"
                step="1"
                className={styles.input}
                placeholder="Amount per month"
                value={monthlyPay}
                onChange={(e) => setMonthlyPay(e.target.value)}
                aria-invalid={!!errors.monthlyPay}
              />
            </div>
            {errors.monthlyPay && (
              <p className={styles.fieldError} role="alert">{errors.monthlyPay}</p>
            )}
          </div>

          {status === "error" && (
            <div className={styles.serverError} role="alert">
              <p>{serverError}</p>
              <p className={styles.serverErrorHint}>
                Check your connection and press Submit to retry.
              </p>
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === "submitting"}
          >
            {status === "submitting" ? (
              <>
                <span className={styles.btnSpinner} aria-hidden="true" />
                Submitting…
              </>
            ) : status === "error" ? (
              "Retry Submission"
            ) : (
              "Submit Registration"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
