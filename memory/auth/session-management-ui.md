# Memory: auth/session-management-ui
Updated: 2026-02-03

Authentication UI includes "Show Password" (Eye/EyeOff) toggles and a "Keep me signed in" (Manter conectado) preference. The "Remember Me" state is persisted in localStorage, while unchecking it sets a 'session_temporary' flag in sessionStorage to imply session cleanup upon browser closure. This design balances user convenience with session persistence control.
