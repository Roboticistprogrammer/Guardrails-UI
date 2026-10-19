import droneMask from '../../../brand/logo/master-drone-mask.png'
import xMask from '../../../brand/logo/master-x-mask.png'
import './Logo.css'

// The DroneX master wordmark, stacked from its two colourless masks so each
// layer takes its brand colour per theme (brand/BRAND.md, rule 1).
export default function Logo({ width = 120 }: { width?: number }) {
  return (
    <span className="logo" role="img" aria-label="DroneX" style={{ width }}>
      <span className="logo-layer logo-x" style={{ maskImage: `url(${xMask})` }} />
      <span className="logo-layer logo-d" style={{ maskImage: `url(${droneMask})` }} />
    </span>
  )
}
