import {useState} from 'react';
import {Dropdown, InputNumber} from 'antd';
import {BorderOutlined, RadiusSettingOutlined, PlusOutlined} from '@ant-design/icons';
import type {ShapeType} from '../hooks/useMapEditing';

const POPULAR_EMOJI = ['⭐', '❤️', '🌙', '🔔', '💎', '🍀', '🦋', '🐾', '🌸', '⚡', '🔥', '🎯'];

interface ShapePickerDropdownProps {
    onDrawShape?: (shape: ShapeType, sizeMeters: number) => void;
    onDrawEmoji?: (emoji: string, sizeMeters: number) => void;
    children?: React.ReactNode;
    placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'top' | 'bottom';
}

const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 8px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
};

const shapes: {key: ShapeType; label: string; icon: React.ReactNode}[] = [
    {key: 'square', label: 'Square', icon: <BorderOutlined />},
    {key: 'circle', label: 'Circle', icon: <RadiusSettingOutlined />},
    {key: 'hexagon', label: 'Hexagon', icon: <span style={{fontSize: 14, lineHeight: 1}}>⬡</span>},
];

const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
};
const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
};

export const ShapePickerDropdown = ({
    onDrawShape,
    onDrawEmoji,
    children,
    placement = 'topLeft',
}: ShapePickerDropdownProps) => {
    const [size, setSize] = useState(5);

    const dropdownContent = (
        <div
            style={{
                background: 'rgba(30, 30, 30, 0.97)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: 8,
                minWidth: 200,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
        >
            {/* Size control */}
            <div style={{padding: '4px 8px 8px', display: 'flex', alignItems: 'center', gap: 8}}>
                <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>Size</span>
                <InputNumber
                    size="small"
                    min={0.1}
                    max={500}
                    step={0.1}
                    value={size}
                    onChange={(v) => { if (v != null) setSize(v); }}
                    suffix="m"
                    style={{width: 90}}
                />
            </div>

            <div style={{height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px 4px'}} />

            {/* Geometry shapes */}
            {shapes.map((s) => (
                <button
                    key={s.key}
                    onClick={() => onDrawShape?.(s.key, size)}
                    style={menuItemStyle}
                    onMouseOver={hoverOn}
                    onMouseOut={hoverOff}
                >
                    {s.icon}
                    {s.label}
                </button>
            ))}

            <div style={{height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px'}} />

            {/* Emoji section */}
            <div style={{padding: '4px 8px 2px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600}}>
                Emoji
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 2,
                padding: '2px 4px 4px',
            }}>
                {POPULAR_EMOJI.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => onDrawEmoji?.(emoji, size)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 20,
                            padding: 4,
                            cursor: 'pointer',
                            lineHeight: 1,
                            transition: 'background 0.15s',
                        }}
                        onMouseOver={hoverOn}
                        onMouseOut={hoverOff}
                        title={emoji}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <Dropdown
            trigger={['click']}
            placement={placement}
            dropdownRender={() => dropdownContent}
        >
            {children ? (
                <span style={{display: 'inline-flex'}}>{children}</span>
            ) : (
                <button
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: '#e8e8e8',
                        fontSize: 14,
                        cursor: 'pointer',
                    }}
                >
                    <PlusOutlined />
                    Add
                </button>
            )}
        </Dropdown>
    );
};

export default ShapePickerDropdown;
