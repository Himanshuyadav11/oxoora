const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('togglePassword');

function setStatus(message, isError = false) {
  loginStatus.textContent = message;
  loginStatus.style.color = isError ? '#ff9d9d' : '#c6a45c';
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

togglePasswordButton.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePasswordButton.textContent = isPassword ? 'Hide' : 'Show';
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value.trim();

  try {
    const result = await apiRequest('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    window.location.href = result.redirectTo || '/admin/dashboard';
  } catch (error) {
    setStatus(error.message, true);
  }
});

(async () => {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  if (reason) {
    setStatus(reason);
  }

  try {
    const auth = await apiRequest('/api/me');
    if (auth.authenticated) {
      window.location.replace('/admin/dashboard');
    }
  } catch (_error) {
    // Ignore auth check failures on login screen.
  }
})();
