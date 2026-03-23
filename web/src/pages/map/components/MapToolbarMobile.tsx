import {useState} from "react";
import {Button, Dropdown, Space} from "antd";
import type {MenuProps} from "antd";
import {
    UndoOutlined,
    RedoOutlined,
    GlobalOutlined,
    EllipsisOutlined,
    SaveOutlined,
    EditOutlined,
    FormOutlined,
    CloseOutlined,
    BorderOutlined,
    DeleteOutlined,
    MergeCellsOutlined,
    DatabaseOutlined,
    DownloadOutlined,
    UploadOutlined,
    ScissorOutlined,
    ControlOutlined,
    StopOutlined,
    PlayCircleOutlined,
    HomeOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import type {MenuInfo} from "rc-menu/lib/interface";
import AsyncButton from "../../../components/AsyncButton.tsx";
import type {Feature} from "geojson";
import type {MenuItemType} from "antd/es/menu/interface";

interface MowingAreaItem extends MenuItemType {
    feat: Feature;
}

interface MapToolbarMobileProps {
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
    stateName?: string;
    emergency?: boolean;
    onStart?: () => Promise<void>;
    onHome?: () => Promise<void>;
    onEmergencyOn?: () => Promise<void>;
    onEmergencyOff?: () => Promise<void>;
}

const toolbarStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 12,
    left: 8,
    right: 8,
    zIndex: 10,
    display: "flex",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 10,
    padding: "8px 10px",
};

export const MapToolbarMobile = ({
    editMap, hasUnsavedChanges, manualMode, useSatellite,
    historyIndex, editHistoryLength, mowingAreas,
    onEditMap, onSaveMap, onUndo, onRedo, onToggleSatellite,
    onManualMode, onStopManualMode,
    onBackupMap, onRestoreMap, onDownloadGeoJSON, onUploadGeoJSON,
    onMowArea, selectedFeatureCount = 0, onEditSelectedFeature,
    onDrawPolygon, onTrash, onCombine,
    stateName, emergency,
    onStart, onHome, onEmergencyOn, onEmergencyOff,
}: MapToolbarMobileProps) => {
    const [mowLoading, setMowLoading] = useState(false);

    const dataMenuItems: MenuProps["items"] = [
        {key: "satellite", icon: <GlobalOutlined />, label: useSatellite ? "Dark map" : "Satellite"},
        {type: "divider"},
        ...(manualMode
            ? [{key: "stopManual", icon: <StopOutlined />, label: "Stop Manual Mowing", danger: true} satisfies NonNullable<MenuProps["items"]>[number]]
            : [{key: "manual", icon: <ControlOutlined />, label: "Manual Mowing"} satisfies NonNullable<MenuProps["items"]>[number]]
        ),
        {type: "divider"},
        {key: "backup", icon: <DatabaseOutlined />, label: "Backup Map"},
        {key: "restore", icon: <DatabaseOutlined />, label: "Restore Map"},
        {type: "divider"},
        {key: "download", icon: <DownloadOutlined />, label: "Download GeoJSON"},
        ...(editMap
            ? [{key: "upload", icon: <UploadOutlined />, label: "Upload GeoJSON"} satisfies NonNullable<MenuProps["items"]>[number]]
            : []),
    ];

    const handleMoreClick: MenuProps["onClick"] = ({key}: MenuInfo) => {
        switch (key) {
            case "satellite": onToggleSatellite(); break;
            case "manual": onManualMode(); break;
            case "stopManual": onStopManualMode(); break;
            case "backup": onBackupMap(); break;
            case "restore": onRestoreMap(); break;
            case "download": onDownloadGeoJSON(); break;
            case "upload": onUploadGeoJSON(); break;
        }
    };

    const handleMowClick: MenuProps["onClick"] = ({key}: MenuInfo) => {
        setMowLoading(true);
        onMowArea(key).finally(() => setMowLoading(false));
    };

    const editMenuItems: MenuProps["items"] = [
        {key: "editProps", icon: <FormOutlined />, label: "Edit Properties", disabled: selectedFeatureCount !== 1},
        {key: "combine", icon: <MergeCellsOutlined />, label: "Combine", disabled: selectedFeatureCount === 0},
        {type: "divider"},
        ...dataMenuItems,
    ];

    const handleEditMenuClick: MenuProps["onClick"] = ({key}: MenuInfo) => {
        switch (key) {
            case "editProps": onEditSelectedFeature?.(); break;
            case "combine": onCombine?.(); break;
            default: handleMoreClick({key} as MenuInfo); break;
        }
    };

    if (editMap) {
        return (
            <div style={toolbarStyle}>
                <Space.Compact size="middle">
                    <AsyncButton
                        type="primary"
                        danger={hasUnsavedChanges}
                        icon={<SaveOutlined />}
                        onAsyncClick={onSaveMap}
                        aria-label="Save"
                    />
                    <Button
                        icon={<CloseOutlined />}
                        onClick={onEditMap}
                        aria-label="Cancel"
                    />
                </Space.Compact>

                <Space.Compact size="middle">
                    <Button
                        icon={<UndoOutlined />}
                        onClick={onUndo}
                        disabled={historyIndex <= 0}
                        aria-label="Undo"
                    />
                    <Button
                        icon={<RedoOutlined />}
                        onClick={onRedo}
                        disabled={historyIndex >= editHistoryLength - 1}
                        aria-label="Redo"
                    />
                </Space.Compact>

                <Space.Compact size="middle">
                    <Button
                        icon={<BorderOutlined />}
                        onClick={onDrawPolygon}
                        aria-label="Draw polygon"
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        disabled={selectedFeatureCount === 0}
                        onClick={onTrash}
                        aria-label="Delete"
                    />
                </Space.Compact>

                <Dropdown
                    menu={{items: editMenuItems, onClick: handleEditMenuClick}}
                    trigger={["click"]}
                    placement="topRight"
                >
                    <Button icon={<EllipsisOutlined />} aria-label="More" />
                </Dropdown>
            </div>
        );
    }

    // View mode
    const isIdle = stateName === "IDLE";
    return (
        <div style={toolbarStyle}>
            {isIdle ? (
                <AsyncButton
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onAsyncClick={onStart!}
                    aria-label="Start"
                />
            ) : (
                <AsyncButton
                    type="primary"
                    icon={<HomeOutlined />}
                    onAsyncClick={onHome!}
                    aria-label="Home"
                />
            )}

            {!emergency ? (
                <AsyncButton
                    danger
                    icon={<WarningOutlined />}
                    onAsyncClick={onEmergencyOn!}
                    aria-label="Emergency On"
                />
            ) : (
                <AsyncButton
                    danger
                    icon={<WarningOutlined />}
                    onAsyncClick={onEmergencyOff!}
                    aria-label="Emergency Off"
                />
            )}

            <Button
                icon={<EditOutlined />}
                onClick={onEditMap}
                aria-label="Edit Map"
            />

            <Dropdown
                menu={{items: mowingAreas, onClick: handleMowClick}}
                trigger={["click"]}
                placement="topLeft"
            >
                <Button
                    icon={<ScissorOutlined />}
                    loading={mowLoading}
                    aria-label="Mow area"
                >
                    Mow
                </Button>
            </Dropdown>

            <Dropdown
                menu={{items: dataMenuItems, onClick: handleMoreClick}}
                trigger={["click"]}
                placement="topRight"
            >
                <Button icon={<EllipsisOutlined />} aria-label="More" />
            </Dropdown>
        </div>
    );
};
