export function AmbientGlow() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute w-[600px] h-[600px] -top-[150px] -left-[100px] rounded-full blur-[120px] opacity-[0.18] animate-glow-drift"
        style={{ background: 'radial-gradient(circle, rgba(58,157,176,0.6), transparent 70%)' }} />
      <div className="absolute w-[450px] h-[450px] -bottom-[80px] -right-[60px] rounded-full blur-[120px] opacity-[0.18] animate-glow-drift"
        style={{ background: 'radial-gradient(circle, rgba(126,200,227,0.3), transparent 70%)', animationDelay: '-12s', animationDuration: '30s' }} />
      <div className="absolute w-[350px] h-[350px] top-[40%] left-[50%] rounded-full blur-[120px] opacity-[0.15] animate-glow-drift"
        style={{ background: 'radial-gradient(circle, rgba(91,184,208,0.15), transparent 70%)', animationDelay: '-6s', animationDuration: '25s' }} />
    </div>
  );
}
