export const itemTypes = ['trampoline', 'drone', 'rocket', 'bomb', 'spikes', 'medkit', 'adrenaline'];

export function getItemForPlatform() {
    const rand = Math.random();
    if (rand < 0.004) return 'rocket';
    if (rand < 0.008) return 'drone';
    if (rand < 0.015) return 'trampoline';
    if (rand < 0.025) return 'bomb';
    if (rand < 0.040) return 'spikes';
    if (rand < 0.050) return 'adrenaline';
    if (rand < 0.075) return 'medkit';
    return null;
}
