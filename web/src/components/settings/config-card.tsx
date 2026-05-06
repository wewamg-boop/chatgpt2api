

import { LoaderCircle, PlugZap, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { testProxy, type ProxyTestResult } from "../../lib/server-api";

import { useSettingsStore } from "./settings-store";

export function ConfigCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<ProxyTestResult | null>(null);
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setAuthKey = useSettingsStore((state) => state.setAuthKey);
  const setRefreshAccountIntervalMinute = useSettingsStore((state) => state.setRefreshAccountIntervalMinute);
  const setProxy = useSettingsStore((state) => state.setProxy);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const saveConfig = useSettingsStore((state) => state.saveConfig);
  const setConfigField = (field: string, value: unknown) => {
    const cfg = useSettingsStore.getState().config;
    if (cfg) {
      useSettingsStore.setState({ config: { ...cfg, [field]: value } });
    }
  };

  const handleTestProxy = async () => {
    const candidate = String(config?.proxy || "").trim();
    if (!candidate) {
      toast.error("请先填写代理地址");
      return;
    }
    setIsTestingProxy(true);
    setProxyTestResult(null);
    try {
      const data = await testProxy(candidate);
      setProxyTestResult(data.result);
      if (data.result.ok) {
        toast.success(`代理可用（${data.result.latency_ms} ms，HTTP ${data.result.status}）`);
      } else {
        toast.error(`代理不可用：${data.result.error ?? "未知错误"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "测试代理失败");
    } finally {
      setIsTestingProxy(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-gray-400 dark:text-gray-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">登录密钥</label>
            <Input
              value={String(config?.["auth-key"] || "")}
              onChange={(event) => setAuthKey(event.target.value)}
              placeholder="auth-key"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">用于后台登录验证。</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">账号刷新间隔</label>
            <Input
              value={String(config?.refresh_account_interval_minute || "")}
              onChange={(event) => setRefreshAccountIntervalMinute(event.target.value)}
              placeholder="分钟"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">单位分钟，控制账号自动刷新频率。</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">全局代理</label>
            <Input
              value={String(config?.proxy || "")}
              onChange={(event) => {
                setProxy(event.target.value);
                setProxyTestResult(null);
              }}
              placeholder="http://127.0.0.1:7890"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">留空表示不使用代理。</p>
            {proxyTestResult ? (
              <div
                className={`rounded-xl border px-3 py-2 text-xs leading-6 ${
                  proxyTestResult.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {proxyTestResult.ok
                  ? `代理可用：HTTP ${proxyTestResult.status}，用时 ${proxyTestResult.latency_ms} ms`
                  : `代理不可用：${proxyTestResult.error ?? "未知错误"}（用时 ${proxyTestResult.latency_ms} ms）`}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-gray-200 dark:border-gray-700 bg-white px-4 text-gray-700 dark:text-gray-300"
                onClick={() => void handleTestProxy()}
                disabled={isTestingProxy}
              >
                {isTestingProxy ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                测试代理
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">图片访问地址</label>
            <Input
              value={String(config?.base_url || "")}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://example.com"
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">用于生成图片结果的访问前缀地址。</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">全局系统提示</label>
            <textarea
              value={String(config?.global_system_prompt || "")}
              onChange={(e) => setConfigField("global_system_prompt", e.target.value)}
              placeholder="附加到每个请求的系统提示..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">图片轮询超时(秒)</label>
            <Input
              type="number"
              value={String(config?.image_poll_timeout_secs || 120)}
              onChange={(e) => setConfigField("image_poll_timeout_secs", parseInt(e.target.value) || 120)}
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">图片账号并发数</label>
            <Input
              type="number"
              value={String(config?.image_account_concurrency || 1)}
              onChange={(e) => setConfigField("image_account_concurrency", parseInt(e.target.value) || 1)}
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700 dark:text-gray-300">图片保留天数</label>
            <Input
              type="number"
              value={String(config?.image_retention_days || 7)}
              onChange={(e) => setConfigField("image_retention_days", parseInt(e.target.value) || 7)}
              className="h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!config?.auto_remove_invalid_accounts}
                onChange={(e) => setConfigField("auto_remove_invalid_accounts", e.target.checked)}
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">自动移除无效账号</label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!config?.auto_remove_rate_limited_accounts}
                onChange={(e) => setConfigField("auto_remove_rate_limited_accounts", e.target.checked)}
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">自动移除限流账号</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-10 rounded-xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 px-5 text-white hover:bg-gray-800 dark:hover:bg-gray-200"
            onClick={() => void saveConfig()}
            disabled={isSavingConfig}
          >
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
