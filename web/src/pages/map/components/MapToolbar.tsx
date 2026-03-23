import {Button, Divider, Dropdown, Space, Tooltip} from "antd";
import type {MenuProps} from "antd";
import type {MenuItemType} from "antd/es/menu/interface";
import {
    UndoOutlined,
    RedoOutlined,
    GlobalOutlined,
    EllipsisOutlined,
    SaveOutlined,
    EditOutlined,
    FormOutlined,
    CloseOutlined,
    DatabaseOutlined,
    DownloadOutlined,
    UploadOutlined,
    BorderOutlined,
    DeleteOutlined,
    MergeCellsOutlined,
} from "@ant-design/icons";
import type {MenuInfo} from "rc-menu/lib/interface";
import {MowerActions} from "../../../components/MowerActions.tsx";
import AsyncButton from "../../../components/AsyncButton.tsx";
import AsyncDropDownButton from "../../../components/AsyncDropDownButton.tsx";
import type {Feature} from "geojson";

interface MowingAreaItem extends MenuItemType {
    feat: Feature;
}

interface MapToolbarProps {
    editMap: boolean;
    hasUnsavedChanges: boolean;
    manualMode: number | undefined;
    useSatellite: boolean;
    historyIndex: number;
    editHistoryLength: number;
    mowingAreas: MowingAreaItem[];
    onEditMap: () => void;
    onSaveMap: () => Promise<void>;
    onUndo: () => void;
    onRedo: () => void;
    onToggleSatellite: () => void;
    onManualMode: () => Promise<void>;
    onStopManualMode: () => Promise<void>;
    onBackupMap: () => void;
    onRestoreMap: () => void;
    onDownloadGeoJSON: () => void;
    onUploadGeoJSON: () => void;
    onMowArea: (key: string) => Promise<void>;
    selectedFeatureCount?: number;
    onEditSelectedFeature?: () => void;
    onDrawPolygon?: () => void;
    onTrash?: () => void;
    onCombine?: () => void;
}

export const MapToolbar = ({
    editMap, hasUnsavedChanges, manualMode, useSatellite,
    historyIndex, editHistoryLength, mowingAreas,
    onEditMap, onSaveMap, onUndo, onRedo, onToggleSatellite,
    onManualMode, onStopManualMode,
    onBackupMap, onRestoreMap, onDownloadGeoJSON, onUploadGeoJSON,
    onMowArea, selectedFeatureCount = 0, onEditSelectedFeature,
    onDrawPolygon, onTrash, onCombine,
}: MapToolbarProps) => {
    const dataMenuItems: MenuProps["items"] = [
        {
            key: "backup",
            icon: <DatabaseOutlined />,
            label: "Backup Map",
        },
        {
            key: "restore",
            icon: <DatabaseOutlined />,
            label: "Restore Map",
        },
        {
            type: "divider",
        },
        {
            key: "download",
            icon: <DownloadOutlined />,
            label: "Download GeoJSON",
        },
        ...(editMap
            ? [
                  {
                      key: "upload",
                      icon: <UploadOutlined />,
                      label: "Upload GeoJSON",
                  } satisfies NonNullable<MenuProps["items"]>[number],
              ]
            : []),
    ];

    const handleDataMenuClick: MenuProps["onClick"] = ({key}: MenuInfo) => {
        switch (key) {
            case "backup":
                onBackupMap();
                break;
            case "restore":
                onRestoreMap();
                break;
            case "download":
                onDownloadGeoJSON();
                break;
            case "upload":
                onUploadGeoJSON();
                break;
        }
    };

    return (
        <MowerActions>
            <Space wrap size="small">
                {/* Edit group */}
                {!editMap && (
                    <Button
                        key="btnEdit"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={onEditMap}
                    >
                        Edit Map
                    </Button>
                )}
                {editMap && (
                    <AsyncButton
                        key="btnSave"
                        type="primary"
                        danger={hasUnsavedChanges}
                        icon={<SaveOutlined />}
                        onAsyncClick={onSaveMap}
                        style={
                            hasUnsavedChanges
                                ? {boxShadow: "0 0 0 3px rgba(255, 77, 79, 0.35)"}
                                : undefined
                        }
                    >
                        {hasUnsavedChanges ? "Save Map *" : "Save Map"}
                    </AsyncButton>
                )}
                {editMap && (
                    <Button
                        key="btnCancel"
                        icon={<CloseOutlined />}
                        onClick={onEditMap}
                    >
                        Cancel
                    </Button>
                )}
                {editMap && (
                    <Space.Compact key="undoRedo">
                        <Tooltip title="Undo">
                            <Button
                                icon={<UndoOutlined />}
                                onClick={onUndo}
                                disabled={historyIndex <= 0}
                                aria-label="Undo"
                            />
                        </Tooltip>
                        <Tooltip title="Redo">
                            <Button
                                icon={<RedoOutlined />}
                                onClick={onRedo}
                                disabled={historyIndex >= editHistoryLength - 1}
                                aria-label="Redo"
                            />
                        </Tooltip>
                    </Space.Compact>
                )}

                {editMap && (
                    <Tooltip title="Select an area, then click to edit its name and type">
                        <Button
                            key="btnEditProps"
                            icon={<FormOutlined />}
                            disabled={selectedFeatureCount !== 1}
                            onClick={onEditSelectedFeature}
                        >
                            Edit Properties
                        </Button>
                    </Tooltip>
                )}
                {editMap && (
                    <Divider type="vertical" style={{height: "2em"}} />
                )}
                {editMap && (
                    <Space.Compact key="drawTools">
                        <Tooltip title="Draw new polygon">
                            <Button
                                icon={<BorderOutlined />}
                                onClick={onDrawPolygon}
                                aria-label="Draw polygon"
                            >
                                Draw
                            </Button>
                        </Tooltip>
                        <Tooltip title="Delete selected feature">
                            <Button
                                icon={<DeleteOutlined />}
                                disabled={selectedFeatureCount === 0}
                                onClick={onTrash}
                                aria-label="Delete"
                            />
                        </Tooltip>
                        <Tooltip title="Combine selected features">
                            <Button
                                icon={<MergeCellsOutlined />}
                                disabled={selectedFeatureCount === 0}
                                onClick={onCombine}
                                aria-label="Combine"
                            />
                        </Tooltip>
                    </Space.Compact>
                )}

                {/* View group */}
                <Divider type="vertical" style={{height: "2em"}} />
                <Tooltip
                    title={useSatellite ? "Switch to dark map" : "Switch to satellite"}
                >
                    <Button
                        key="btnSatellite"
                        icon={<GlobalOutlined />}
                        onClick={onToggleSatellite}
                    >
                        {useSatellite ? "Dark" : "Satellite"}
                    </Button>
                </Tooltip>

                {/* Mowing group — view mode only */}
                {!editMap && (
                    <>
                        <Divider type="vertical" style={{height: "2em"}} />
                        <AsyncDropDownButton
                            key="slctAreas"
                            menu={{
                                items: mowingAreas,
                                onAsyncClick: (e: MenuInfo) => onMowArea(e.key),
                            }}
                        >
                            Mow area
                        </AsyncDropDownButton>
                        {!manualMode && (
                            <AsyncButton
                                key="btnManualMode"
                                onAsyncClick={onManualMode}
                            >
                                Manual mowing
                            </AsyncButton>
                        )}
                        {manualMode && (
                            <AsyncButton
                                key="btnAutoMode"
                                danger
                                onAsyncClick={onStopManualMode}
                            >
                                Stop Manual Mowing
                            </AsyncButton>
                        )}
                    </>
                )}

                {/* Data group — collapsed into More dropdown */}
                <Divider type="vertical" style={{height: "2em"}} />
                <Dropdown
                    menu={{items: dataMenuItems, onClick: handleDataMenuClick}}
                    trigger={["click"]}
                >
                    <Button icon={<EllipsisOutlined />}>More</Button>
                </Dropdown>
            </Space>
        </MowerActions>
    );
};
