import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {Badge, Space, Typography} from "antd";
import {PoweroffOutlined, WifiOutlined} from "@ant-design/icons"
import {stateRenderer} from "./utils.tsx";
import {COLORS} from "../theme/colors.ts";

const statusColor = (state: string | undefined): string => {
    switch (state) {
        case "MOWING":
        case "DOCKING":
        case "UNDOCKING":
            return COLORS.primary;
        case "IDLE":
            return COLORS.warning;
        default:
            return COLORS.danger;
    }
};

export const MowerStatus = () => {
    const {highLevelStatus} = useHighLevelStatus();
    const gpsPercent = Math.round((highLevelStatus.GpsQualityPercent ?? 0) * 100);
    const batteryPercent = Math.round((highLevelStatus.BatteryPercent ?? 0) * 100);

    return (
        <Space size="small" style={{flexShrink: 0}}>
            <Space size={4}>
                <Badge color={statusColor(highLevelStatus.StateName)} />
                <Typography.Text style={{fontSize: 12, color: COLORS.text, whiteSpace: 'nowrap'}}>
                    {stateRenderer(highLevelStatus.StateName)}
                </Typography.Text>
            </Space>
            <Space size={4}>
                <WifiOutlined style={{color: gpsPercent > 0 ? COLORS.primary : COLORS.danger, fontSize: 13}}/>
                <Typography.Text style={{fontSize: 12, color: COLORS.text}}>
                    {gpsPercent}%
                </Typography.Text>
            </Space>
            <Space size={4}>
                <PoweroffOutlined style={{
                    color: highLevelStatus.IsCharging ? COLORS.primary : COLORS.muted,
                    fontSize: 13,
                }}/>
                <Typography.Text style={{fontSize: 12, color: COLORS.text}}>
                    {batteryPercent}%
                </Typography.Text>
            </Space>
        </Space>
    );
}
