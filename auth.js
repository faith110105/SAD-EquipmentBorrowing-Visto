let currentUser = null;

async function requireAuth() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    location.href = "login.html";
    return;
  }
  currentUser = data.user;
  window.currentUser = currentUser;
  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = currentUser.email;

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.href = "login.html";
  });
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") location.href = "login.html";
});
