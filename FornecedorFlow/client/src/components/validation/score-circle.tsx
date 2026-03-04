interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreCircle({ score, size = 'lg' }: ScoreCircleProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  // Calculate the stroke-dasharray for the progress
  // Circumference = 2 * π * r, where r = 15.9155 (SVG viewBox radius)
  const circumference = 2 * Math.PI * 15.9155;
  const strokeDasharray = `${(score / 100) * circumference}, ${circumference}`;

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(142, 76%, 36%)'; // success
    if (score >= 50) return 'hsl(38, 92%, 50%)'; // warning
    return 'hsl(0, 84.2%, 60.2%)'; // destructive
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`} data-testid="score-circle">
      <svg 
        className={`${sizeClasses[size]} transform -rotate-90`} 
        viewBox="0 0 36 36"
      >
        {/* Background circle */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="2"
        />
        {/* Progress circle */}
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="2"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dasharray 1s ease-in-out',
          }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span 
            className={`${textSizeClasses[size]} font-bold text-foreground`}
            data-testid="score-value"
          >
            {score}
          </span>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
    </div>
  );
}
