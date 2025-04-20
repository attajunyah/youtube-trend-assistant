import React from "react";
import "./Button.css";

type ButtonProps = {
    onClick?: () => void;
    children: React.ReactNode;
    disabled?: boolean;
};

export default function Button({ onClick, children, disabled }: ButtonProps) {
    return (
        <button className="btn-primary" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    );
}
