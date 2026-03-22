package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupOpenMowerRouter(provider types.IRosProvider) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	group := r.Group("/api")
	OpenMowerRoutes(group, provider)
	return r
}

func TestServiceRoute_HighLevelControl(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{"Command": 1}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/high_level_control", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_service/high_level_control", mock.ServiceCalls[0].SrvName)
}

func TestServiceRoute_Emergency(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{"Emergency": 1}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/emergency", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_service/emergency", mock.ServiceCalls[0].SrvName)
}

func TestServiceRoute_MowEnabled(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{"MowEnabled": 1, "MowDirection": 0}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/mow_enabled", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_service/mow_enabled", mock.ServiceCalls[0].SrvName)
}

func TestServiceRoute_MowerLogic(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{
		"Config": map[string]any{
			"Bools": []map[string]any{
				{"Name": "manual_pause_mowing", "Value": true},
			},
		},
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/mower_logic", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_logic/set_parameters", mock.ServiceCalls[0].SrvName)
}

func TestServiceRoute_UnknownCommand(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/unknown_command", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var resp ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "unknown command", resp.Error)
}

func TestServiceRoute_ServiceError(t *testing.T) {
	mock := types.NewMockRosProvider()
	mock.ServiceErr = assert.AnError
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{"Command": 1}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/high_level_control", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestServiceRoute_StartInArea(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{"Area": 2}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/call/start_in_area", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_service/start_in_area", mock.ServiceCalls[0].SrvName)
}

func TestClearMapRoute(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/openmower/map", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_map_service/clear_map", mock.ServiceCalls[0].SrvName)
}

func TestClearMapRoute_Error(t *testing.T) {
	mock := types.NewMockRosProvider()
	mock.ServiceErr = assert.AnError
	router := setupOpenMowerRouter(mock)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/openmower/map", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestSetDockingPointRoute(t *testing.T) {
	mock := types.NewMockRosProvider()
	router := setupOpenMowerRouter(mock)

	payload := map[string]any{
		"dockX":    1.5,
		"dockY":    2.5,
		"heading":  0.78,
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/openmower/map/docking", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	require.Len(t, mock.ServiceCalls, 1)
	assert.Equal(t, "/mower_map_service/set_docking_point", mock.ServiceCalls[0].SrvName)
}
