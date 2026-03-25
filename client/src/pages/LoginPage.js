import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export const LoginPage = () => {
    const { login, user, isBootstrapping } = useAuth();
    const [email, setEmail] = useState("admin@agency.local");
    const [password, setPassword] = useState("Password123!");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const onSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login(email, password);
        }
        catch {
            setError("Login failed. Check credentials.");
        }
        finally {
            setLoading(false);
        }
    };
    if (!isBootstrapping && user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsx("main", { className: "auth-page", children: _jsxs("form", { className: "auth-card", onSubmit: onSubmit, children: [_jsx("h1", { children: "Agency Command Board" }), _jsx("p", { children: "Sign in with a seeded account." }), _jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { id: "email", type: "email", value: email, onChange: (event) => setEmail(event.target.value) }), _jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (event) => setPassword(event.target.value) }), error ? _jsx("div", { className: "error", children: error }) : null, _jsx("button", { type: "submit", disabled: loading, children: loading ? "Signing in..." : "Sign in" })] }) }));
};
