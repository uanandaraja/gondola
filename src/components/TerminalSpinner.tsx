import { useEffect, useState } from "react";

// Classic rotating line spinner - clearer motion
const SPINNER_FRAMES = ["|", "/", "—", "\\"];

interface TerminalSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

const sizeClasses = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
};

export function TerminalSpinner({
	size = "md",
	className = "",
}: TerminalSpinnerProps) {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
		}, 100);

		return () => clearInterval(interval);
	}, []);

	return (
		<output
			className={`inline-block font-mono font-bold ${sizeClasses[size]} ${className}`}
			aria-label="Loading"
		>
			{SPINNER_FRAMES[frame]}
		</output>
	);
}
