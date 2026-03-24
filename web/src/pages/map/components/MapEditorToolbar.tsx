import {Tooltip} from "antd";
import {
    SaveOutlined,
    CloseOutlined,
    UndoOutlined,
    RedoOutlined,
    BorderOutlined,
    DeleteOutlined,
    MergeCellsOutlined,
    SplitCellsOutlined,
    MinusSquareOutlined,
    FormOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import AsyncButton from "../../../components/AsyncButton.tsx";
import {ShapePickerDropdown} from "./ShapePickerDropdown.tsx";
import type {ShapeType} from "../hooks/useMapEditing.ts";

interface MapEditorToolbarProps {
    hasUnsavedChanges: boolean;
    historyIndex: number;
    editHistoryLength: number;
    selectedFeatureCount: number;
    onSaveMap: () => Promise<void>;
    onCancel: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onDrawPolygon?: () => void;
    onDrawShape?: (shape: ShapeType, sizeMeters: number) => void;
    onDrawEmoji?: (emoji: string, sizeMeters: number) => void;
    onTrash?: () => void;
    onCombine?: () => void;
    onSubtract?: () => void;
    onSplit?: () => void;
    onEditSelectedFeature?: () => void;
}

const glassStyle: React.CSSProperties = {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: 'rgba(20, 20, 20, 0.75)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    padding: 6,
};

const btnStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#e8e8e8',
    fontSize: 18,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
};

const dividerStyle: React.CSSProperties = {
    height: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '2px 4px',
};

interface ToolButtonProps {
    icon: React.ReactNode;
    tooltip: string;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    primary?: boolean;
    glow?: boolean;
}

const ToolButton = ({icon, tooltip, onClick, disabled, danger, primary, glow}: ToolButtonProps) => (
    <Tooltip title={tooltip} placement="right">
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                ...btnStyle,
                color: disabled ? 'rgba(255,255,255,0.2)' : danger ? '#ff4d4f' : primary ? '#52c41a' : '#e8e8e8',
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: glow ? '0 0 0 2px rgba(255, 77, 79, 0.4)' : undefined,
            }}
            onMouseOver={(e) => {
                if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            {icon}
        </button>
    </Tooltip>
);

export const MapEditorToolbar = ({
    hasUnsavedChanges, historyIndex, editHistoryLength,
    selectedFeatureCount, onSaveMap, onCancel, onUndo, onRedo,
    onDrawPolygon, onDrawShape, onDrawEmoji, onTrash, onCombine, onSubtract, onSplit, onEditSelectedFeature,
}: MapEditorToolbarProps) => (
    <div style={glassStyle}>
        {/* Save / Cancel */}
        <Tooltip title={hasUnsavedChanges ? "Save Map *" : "Save Map"} placement="right">
            <div>
                <AsyncButton
                    type="text"
                    icon={<SaveOutlined/>}
                    onAsyncClick={onSaveMap}
                    style={{
                        ...btnStyle,
                        color: hasUnsavedChanges ? '#ff4d4f' : '#52c41a',
                        boxShadow: hasUnsavedChanges ? '0 0 0 2px rgba(255, 77, 79, 0.4)' : undefined,
                    }}
                />
            </div>
        </Tooltip>
        <ToolButton icon={<CloseOutlined/>} tooltip="Cancel editing" onClick={onCancel}/>

        <div style={dividerStyle}/>

        {/* Undo / Redo */}
        <ToolButton icon={<UndoOutlined/>} tooltip="Undo" onClick={onUndo} disabled={historyIndex <= 0}/>
        <ToolButton icon={<RedoOutlined/>} tooltip="Redo" onClick={onRedo} disabled={historyIndex >= editHistoryLength - 1}/>

        <div style={dividerStyle}/>

        {/* Drawing tools */}
        <ToolButton icon={<BorderOutlined/>} tooltip="Draw polygon" onClick={onDrawPolygon}/>
        <ShapePickerDropdown onDrawShape={onDrawShape} onDrawEmoji={onDrawEmoji} placement="bottomLeft">
            <Tooltip title="Add shape" placement="right">
                <button
                    style={btnStyle}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <PlusOutlined />
                </button>
            </Tooltip>
        </ShapePickerDropdown>
        <ToolButton icon={<DeleteOutlined/>} tooltip="Delete selected" onClick={onTrash} disabled={selectedFeatureCount === 0} danger/>

        <div style={dividerStyle}/>

        {/* Boolean operations */}
        <ToolButton icon={<MergeCellsOutlined/>} tooltip="Combine (select 2+)" onClick={onCombine} disabled={selectedFeatureCount < 2}/>
        <ToolButton icon={<MinusSquareOutlined/>} tooltip="Subtract (select 2)" onClick={onSubtract} disabled={selectedFeatureCount !== 2}/>
        <ToolButton icon={<SplitCellsOutlined/>} tooltip="Split (select 1, draw line)" onClick={onSplit} disabled={selectedFeatureCount !== 1}/>

        <div style={dividerStyle}/>

        {/* Edit properties */}
        <ToolButton icon={<FormOutlined/>} tooltip="Edit properties" onClick={onEditSelectedFeature} disabled={selectedFeatureCount !== 1}/>
    </div>
);
