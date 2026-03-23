package api

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type SystemInfo struct {
	CPUTemperature *float64 `json:"cpuTemperature,omitempty"`
}

// SystemRoutes registers system info endpoints
func SystemRoutes(r *gin.RouterGroup) {
	group := r.Group("/system")
	group.GET("/info", getSystemInfo)
}

// getSystemInfo returns system information (CPU temperature, etc.)
//
// @Summary get system info
// @Description get system info such as CPU temperature
// @Tags system
// @Produce json
// @Success 200 {object} SystemInfo
// @Router /system/info [get]
func getSystemInfo(c *gin.Context) {
	info := SystemInfo{}

	// Read CPU temperature from thermal zone (Linux/Raspberry Pi)
	if data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp"); err == nil {
		tempStr := strings.TrimSpace(string(data))
		if tempMilliC, err := strconv.ParseFloat(tempStr, 64); err == nil {
			temp := tempMilliC / 1000.0
			info.CPUTemperature = &temp
		}
	}

	c.JSON(http.StatusOK, info)
}
