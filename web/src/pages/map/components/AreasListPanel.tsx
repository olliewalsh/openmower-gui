import {EnvironmentOutlined, CompassOutlined, StopOutlined} from "@ant-design/icons";
import type {AreaListItem} from "../utils/types.ts";

const TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    workarea: {color: '#4caf50', icon: <EnvironmentOutlined/>, label: 'Work Area'},
    navigation: {color: '#888888', icon: <CompassOutlined/>, label: 'Navigation'},
    obstacle: {color: '#bf0000', icon: <StopOutlined/>, label: 'Obstacle'},
};

interface AreasListPanelProps {
    areas: AreaListItem[];
    onAreaClick?: (id: string) => void;
    selectedId?: string;
}

export const AreasListPanel = ({areas, onAreaClick, selectedId}: AreasListPanelProps) => {
    if (areas.length === 0) return null;

    return (
        <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
            {/* Header */}
            <div style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                Areas ({areas.length})
            </div>

            {/* Area items */}
            <div style={{overflowY: 'auto', flex: 1}}>
                {areas.map((item) => {
                    const cfg = TYPE_CONFIG[item.ftype] ?? TYPE_CONFIG.obstacle;
                    const isSelected = selectedId === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onAreaClick?.(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                width: '100%',
                                padding: '10px 12px',
                                background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: 'none',
                                borderLeft: `3px solid ${cfg.color}`,
                                cursor: onAreaClick ? 'pointer' : 'default',
                                transition: 'background 0.15s',
                                textAlign: 'left',
                            }}
                            onMouseOver={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onMouseOut={(e) => {
                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            {/* Type icon */}
                            <span style={{
                                color: cfg.color,
                                fontSize: 16,
                                flexShrink: 0,
                                width: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                {cfg.icon}
                            </span>

                            {/* Name + details */}
                            <div style={{flex: 1, minWidth: 0}}>
                                <div style={{
                                    fontWeight: 500,
                                    fontSize: 13,
                                    color: '#e8e8e8',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {item.name}
                                </div>
                                <div style={{fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1}}>
                                    {item.areaLabel}
                                </div>
                            </div>

                            {/* Mowing order badge */}
                            {item.mowingOrder != null && (
                                <span style={{
                                    backgroundColor: cfg.color,
                                    color: '#fff',
                                    borderRadius: '50%',
                                    width: 22,
                                    height: 22,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                }}>
                                    {item.mowingOrder}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
