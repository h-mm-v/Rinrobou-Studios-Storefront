const forgotForm =
    document.querySelector<HTMLFormElement>("#forgot-password-form")!;
const updateForm =
    document.querySelector<HTMLFormElement>("#update-password-form")!;
const newPassword =
    document.querySelector<HTMLInputElement>("#new-password")!;
const confirmPassword =
    document.querySelector<HTMLInputElement>("#confirm-password")!;
const message =
    document.querySelector<HTMLParagraphElement>("#password-message")!;
const pageTitle =
    document.querySelector<HTMLHeadingElement>("#page-title")!;

// Read the reset token from the page's URL.
// For example, ForgotPassword.html?token=abc123 gives "abc123".
// If the URL has no token parameter, resetToken will be null.s
// A real reset link should include a short-lived token in its URL.
const resetToken = new URLSearchParams(window.location.search).get("token");


// Ask the server to verify the token before showing the update form.
async function showUpdateFormIfTokenIsValid(): Promise<void> {
    // Leave the email form visible if there is no token in the URL.
    if (!resetToken) return;

    try {
        // TODO: Create this API endpoint on the server.
        // Send a GET request to check whether the token is valid and unexpired.
        // encodeURIComponent makes the token safe to include in a URL parameter.
        const response = await fetch(
            `/api/verify-reset-token?token=${encodeURIComponent(resetToken)}`
        );

        if (!response.ok) {
            message.textContent = "This password reset link is invalid or expired.";
            return;
        }

        forgotForm.hidden = true;
        updateForm.hidden = false;
        pageTitle.textContent = "Update Password";
    } catch {
        message.textContent = "Unable to verify the reset link. Please try again.";
    }
}


// Handle submission of the email form.
forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email =
        document.querySelector<HTMLInputElement>("#email")!.value.trim();

    try {
        // TODO: Create this API endpoint on the server.
        // Send the email address so the server can send a password reset link.
        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            throw new Error("Reset request failed");
        }

        message.textContent = "Check your email for the password reset link.";
    } catch {
        message.textContent = "Unable to request a reset link. Please try again.";
    }
});

// Handle submission of the new password and confirmation.
updateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (newPassword.value !== confirmPassword.value) {
        pageTitle.textContent = "Try a New Password";
        message.textContent = "Passwords don't match. Try again.";
        confirmPassword.focus();
        return;
    }

    if (!resetToken) {
        message.textContent =
            "Open the verified password reset link from your email first.";
        return;
    }

    try {
        // TODO: Create this API endpoint on the server.
        // The server must verify the token, validate and hash the new password,
        // save it, and invalidate the token so it cannot be reused.
        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: resetToken,
                newPassword: newPassword.value,
            }),
        });
        // Show an error if the server rejects the reset request.
        // An expired token is one possible reason for rejection.
        if (!response.ok) {
            message.textContent =
                "The reset link may have expired. Request a new one and try again.";
            return;
        }

        pageTitle.textContent = "Password Confirmed";
        message.textContent = "Your password has been updated.";
        updateForm.hidden = true;
    } catch {
        message.textContent = "Unable to update your password. Please try again.";
    }
});

// Check for a reset token when the script runs.
// void intentionally discards the returned Promise; the function still runs.
void showUpdateFormIfTokenIsValid();