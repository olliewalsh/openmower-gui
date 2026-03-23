import {Collapse, List} from "antd";
import {EnvironmentOutlined, CompassOutlined, StopOutlined} from "@ant-design/icons";
import type {AreaListItem} from "../utils/types.ts";

const TYPE_CONFIG: Record<string, { color: string; border: string; icon: React.ReactNode; label: string }> = {
    workarea: {color: '#4caf50', border: '#4caf50', icon: <EnvironmentOutlined/>, label: 'Work Area'},
    navigation: {color: '#888888', border: '#888888', icon: <CompassOutlined/>, label: 'Navigation'},
    obstacle: {color: '#bf0000', border: '#bf0000', icon: <StopOutlined/>, label: 'Obstacle'},
};

interface AreasListPanelProps {
    areas: AreaListItem[];
    onAreaClick?: (id: string) => void;
}

export const AreasListPanel = ({areas, onAreaClick}: AreasListPanelProps) => {
    if (areas.length === 0) return null;

    return (
        <Collapse size="small" items={[{
            key: 'areas',
            label: `Areas (${areas.length})`,
            children: (
                <List
                    size="small"
                    dataSource={areas}
                    renderItem={(item) => {
                        const cfg = TYPE_CONFIG[item.ftype] ?? TYPE_CONFIG.obstacle;
                        return (
                            <List.Item
                                style={{
                                    padding: '6px 8px',
                                    cursor: onAreaClick ? 'pointer' : undefined,
                                    borderLeft: `3px solid ${cfg.border}`,
                                    marginBottom: 2,
                                }}
                                onClick={() => onAreaClick?.(item.id)}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: 8, width: '100%'}}>
                                    <span style={{color: cfg.color, fontSize: 16}}>{cfg.icon}</span>
                                    <div style={{flex: 1, minWidth: 0}}>
                                        <div style={{fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                            {item.name}
                                        </div>
                                        <div style={{fontSize: 11, color: '#999'}}>
                                            {cfg.label} &middot; {item.areaLabel}
                                        </div>
                                    </div>
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
                                </div>
                            </List.Item>
                        );
                    }}
                />
            ),
        }]}/>
    );
};
