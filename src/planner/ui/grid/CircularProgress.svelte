<script lang="ts">
	interface CircularProgressProps {
		progress: number; // completed time
		limit?: number; // total time allocated (undefined means no limit)
		unit: 'min' | 'hr';
		size?: number; // size of the circle in pixels
	}

	let { progress, limit, unit, size = 24 }: CircularProgressProps = $props();

	// Calculate percentage (0-100+)
	let percentage = $derived.by(() => {
		if (progress === 0 && limit === undefined || limit === 0) {
			// No limit with no progress: gray
			return 0;
		}
		if (limit === undefined || limit === 0) {
			// No limit: always blue
			return -1; // Special value for no-limit case
		}
		return (progress / limit) * 100;
	});

	// Determine color based on percentage
	let color = $derived.by(() => {
		if (percentage === -1 || percentage >= 100) {
			return '#4a9eff'; // blue for no-limit or complete/overflow
		} else if (percentage < 33) {
			return '#ff4444'; // red
		} else if (percentage < 66) {
			return '#ffaa00'; // yellow
		} else {
			return '#44ff44'; // green
		}
	});

	// Calculate SVG parameters for the circular progress
	const strokeWidth = 3;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	
	let strokeDashoffset = $derived.by(() => {
		if (percentage === -1) {
			// No limit: show as full circle
			return 0;
		}
		// Cap at 100% visually even if overflowing
		const cappedPercentage = Math.min(percentage, 100);
		return circumference - (cappedPercentage / 100) * circumference;
	});

	let displayText = $derived.by(() => {
		if (limit === undefined) {
			return `${progress}`;
		}
		return `${progress}/${limit}`;
	});
</script>

<div class="circular-progress" style={`width: ${size}px; height: ${size}px;`} title={`${displayText} ${unit}`}>
	<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
		<!-- Background circle -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="var(--background-modifier-border)"
			stroke-width={strokeWidth}
		/>
		<!-- Progress circle -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke={color}
			stroke-width={strokeWidth}
			stroke-dasharray={circumference}
			stroke-dashoffset={strokeDashoffset}
			stroke-linecap="round"
			transform={`rotate(-90 ${size / 2} ${size / 2})`}
			class="progress-circle"
		/>
	</svg>
</div>

<style>
	.circular-progress {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.progress-circle {
		transition: stroke-dashoffset 0.3s ease, stroke 0.3s ease;
	}

	svg {
		display: block;
	}
</style>
