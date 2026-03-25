import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export const ProtectedRoute = () => {
    const { user, isBootstrapping } = useAuth();
    if (isBootstrapping) {
        return _jsx("div", { className: "centered", children: "Checking your session..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(Outlet, {});
};
