const family = process.argv[2] || 'all', platform = process.argv[3] || 'all';
if (!['all','native','flutter','react-native','harmony'].includes(family) || !['all','android','ios','macos','windows','linux','harmony'].includes(platform)) throw Error('Unknown native CI family/platform');
const runners = {android:'ubuntu-24.04',ios:'macos-15',macos:'macos-15',windows:'windows-2025',linux:'ubuntu-24.04',harmony:'macos-15'};
const jobs = [];
for (const name of ['native','flutter','react-native','harmony']) {
  const targets = name === 'react-native' ? ['android','ios'] : name === 'harmony' ? ['harmony'] : ['android','ios','macos','windows','linux'];
  for (const target of targets) if ((family === 'all' || family === name) && (platform === 'all' || platform === target)) jobs.push({family:name,platform:target,runner:runners[target],id:['flutter','react-native'].includes(name) ? sdkHostId(name,target) : target === 'harmony' ? 'harmony' : ['macos','windows','linux'].includes(target) ? `desktop/${target}` : target});
}
if (!jobs.length) throw Error('This host family does not support the selected platform');
console.log(JSON.stringify({include:jobs}));
import { sdkHostId } from './sdk-install.mjs';
