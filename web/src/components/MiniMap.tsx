import {useNavigate} from "react-router-dom";
import {useSettings} from "../hooks/useSettings.ts";
import {COLORS} from "../theme/colors.ts";
import {MapPage} from "../pages/MapPage.tsx";

export const MiniMap: React.FC<{height?: number}> = ({height = 180}) => {
    const navigate = useNavigate();
    const {settings} = useSettings();

    const datumLon = parseFloat(settings["OM_DATUM_LONG"] ?? "0");
    const datumLat = parseFloat(settings["OM_DATUM_LAT"] ?? "0");
    const hasDatum = !!(datumLon && datumLat) && isFinite(datumLon) && isFinite(datumLat);

    if (!hasDatum) {
        return (
            <div
                onClick={() => navigate("/map")}
                style={{
                    height,
                    borderRadius: 12,
                    background: COLORS.bgCard,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: COLORS.textSecondary,
                    fontSize: 14,
                }}
            >
                Map — waiting for GPS datum
            </div>
        );
    }

    return (
        <div
            onClick={() => navigate("/map")}
            style={{
                height,
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
            }}
        >
            <MapPage compact />
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
            }} />
            <div style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 11,
                color: COLORS.textSecondary,
                zIndex: 2,
            }}>
                Tap to expand
            </div>
        </div>
    );
};
