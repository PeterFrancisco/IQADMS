const isAdmin = localStorage.getItem('isAdmin') === 'true'

{isAdmin ? (
  <>
    <MenuItem label="Profile" to="/profile" />
    <MenuItem label="Add Account" to="/admin/add-account" />
    <MenuItem label="Manage Users" to="/admin/manage-users" />
    <MenuItem label="Logout" onClick={logout} danger />
  </>
) : (
  <>
    <MenuItem label="Profile" to="/profile" />
    <MenuItem label="Report a Bug" to="/report/bug" />
    <MenuItem label="Give Feedback" to="/report/feedback" />
    <MenuItem label="Logout" onClick={logout} danger />
  </>
)}