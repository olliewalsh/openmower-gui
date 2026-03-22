package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupSettingsRouter(dbProvider types.IDBProvider) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	group := r.Group("/api")
	SettingsRoutes(group, dbProvider)
	return r
}

func TestGetSettings_Success(t *testing.T) {
	configFile := createTempConfigFile(t, `export OM_DATUM_LAT="48.123"
export OM_USE_NTRIP="True"
export OM_TOOL_WIDTH="0.13"
`)

	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte(configFile))

	router := setupSettingsRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/settings", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp GetSettingsResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	assert.Equal(t, "48.123", resp.Settings["OM_DATUM_LAT"])
	assert.Equal(t, "True", resp.Settings["OM_USE_NTRIP"])
	assert.Equal(t, "0.13", resp.Settings["OM_TOOL_WIDTH"])
}

func TestGetSettings_FileNotFound(t *testing.T) {
	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte("/nonexistent/config.sh"))

	router := setupSettingsRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/settings", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetSettings_NoConfigKey(t *testing.T) {
	db := types.NewMockDBProvider()
	// Don't set system.mower.configFile

	router := setupSettingsRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/settings", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestPostSettings_NewFile(t *testing.T) {
	configFile := createTempConfigFile(t, "")

	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte(configFile))

	router := setupSettingsRouter(db)

	payload := map[string]any{
		"OM_DATUM_LAT":  "48.999",
		"OM_USE_NTRIP":  true,
		"OM_TOOL_WIDTH": 0.15,
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify file was written
	content, err := os.ReadFile(configFile)
	require.NoError(t, err)

	fileContent := string(content)
	assert.Contains(t, fileContent, "export OM_DATUM_LAT=")
	assert.Contains(t, fileContent, "48.999")
	assert.Contains(t, fileContent, "export OM_USE_NTRIP=")
	assert.Contains(t, fileContent, "export OM_TOOL_WIDTH=")
}

func TestPostSettings_MergesExistingSettings(t *testing.T) {
	configFile := createTempConfigFile(t, `export OM_DATUM_LAT="48.123"
export OM_EXISTING_KEY="keep_me"
`)

	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte(configFile))

	router := setupSettingsRouter(db)

	// Send only one new setting
	payload := map[string]any{
		"OM_DATUM_LAT": "99.999",
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify existing settings were preserved
	content, err := os.ReadFile(configFile)
	require.NoError(t, err)

	fileContent := string(content)
	assert.Contains(t, fileContent, "OM_EXISTING_KEY")
	assert.Contains(t, fileContent, "keep_me")
	assert.Contains(t, fileContent, "99.999")
}

func TestPostSettings_BooleanConversion(t *testing.T) {
	configFile := createTempConfigFile(t, "")

	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte(configFile))

	router := setupSettingsRouter(db)

	payload := map[string]any{
		"OM_ENABLE_MOWER": true,
		"OM_USE_NTRIP":    false,
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	content, err := os.ReadFile(configFile)
	require.NoError(t, err)

	fileContent := string(content)
	assert.Contains(t, fileContent, "True")
	assert.Contains(t, fileContent, "False")
}

func TestPostSettings_InvalidJSON(t *testing.T) {
	db := types.NewMockDBProvider()
	db.Set("system.mower.configFile", []byte("/tmp/test.sh"))

	router := setupSettingsRouter(db)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/settings", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Gin's BindJSON returns 400 for malformed JSON
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func createTempConfigFile(t *testing.T, content string) string {
	t.Helper()
	f, err := os.CreateTemp(t.TempDir(), "mower_config_*.sh")
	require.NoError(t, err)
	_, err = f.WriteString(content)
	require.NoError(t, err)
	f.Close()
	return f.Name()
}
