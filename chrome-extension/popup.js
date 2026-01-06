// Supabase Configuration
const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

// Storage keys
const STORAGE_KEY = 'quality_frotas_session';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const taskForm = document.getElementById('task-form');
const loginBtn = document.getElementById('login-btn');
const createBtn = document.getElementById('create-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const taskError = document.getElementById('task-error');
const taskSuccess = document.getElementById('task-success');
const userEmailSpan = document.getElementById('user-email');

// Current session
let currentSession = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkExistingSession();
  setupEventListeners();
});

// Check for existing session in storage
async function checkExistingSession() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const storedSession = result[STORAGE_KEY];
    
    if (storedSession && storedSession.access_token) {
      // Verify token is still valid
      const isValid = await verifyToken(storedSession.access_token);
      
      if (isValid) {
        currentSession = storedSession;
        showMainScreen();
      } else {
        // Token expired, clear storage
        await chrome.storage.local.remove([STORAGE_KEY]);
        showLoginScreen();
      }
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('Error checking session:', error);
    showLoginScreen();
  }
}

// Verify token with Supabase
async function verifyToken(accessToken) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Setup event listeners
function setupEventListeners() {
  loginForm.addEventListener('submit', handleLogin);
  taskForm.addEventListener('submit', handleCreateTask);
  logoutBtn.addEventListener('click', handleLogout);
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  setButtonLoading(loginBtn, true);
  hideMessage(loginError);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || data.msg || 'Credenciais inválidas');
    }
    
    // Save session to storage
    currentSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user
    };
    
    await chrome.storage.local.set({ [STORAGE_KEY]: currentSession });
    
    showMainScreen();
    loginForm.reset();
    
  } catch (error) {
    showMessage(loginError, error.message);
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

// Handle task creation
async function handleCreateTask(e) {
  e.preventDefault();
  
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  
  if (!title) {
    showMessage(taskError, 'O título é obrigatório');
    return;
  }
  
  setButtonLoading(createBtn, true);
  hideMessage(taskError);
  hideMessage(taskSuccess);
  
  try {
    const taskData = {
      title,
      description: description || null,
      user_id: currentSession.user.id,
      status: 'todo',
      created_at: new Date().toISOString()
    };
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao criar tarefa');
    }
    
    // Success
    showMessage(taskSuccess, '✅ Tarefa criada com sucesso!');
    taskForm.reset();
    
    // Hide success message after 3 seconds
    setTimeout(() => hideMessage(taskSuccess), 3000);
    
  } catch (error) {
    showMessage(taskError, error.message);
  } finally {
    setButtonLoading(createBtn, false);
  }
}

// Handle logout
async function handleLogout() {
  try {
    // Revoke token on server (optional, but good practice)
    if (currentSession?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    await chrome.storage.local.remove([STORAGE_KEY]);
    currentSession = null;
    showLoginScreen();
  }
}

// UI Helpers
function showLoginScreen() {
  loginScreen.style.display = 'block';
  mainScreen.style.display = 'none';
}

function showMainScreen() {
  loginScreen.style.display = 'none';
  mainScreen.style.display = 'block';
  userEmailSpan.textContent = currentSession?.user?.email || '';
}

function setButtonLoading(button, loading) {
  const textSpan = button.querySelector('.btn-text');
  const loadingSpan = button.querySelector('.btn-loading');
  
  button.disabled = loading;
  textSpan.style.display = loading ? 'none' : 'inline';
  loadingSpan.style.display = loading ? 'inline-flex' : 'none';
}

function showMessage(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

function hideMessage(element) {
  element.style.display = 'none';
}
