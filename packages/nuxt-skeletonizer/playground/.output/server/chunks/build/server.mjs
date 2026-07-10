import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { hasInjectionContext, getCurrentInstance, useSSRContext, createApp, defineComponent, inject, ref, computed, watch, nextTick, createVNode, resolveDynamicComponent, mergeProps, withCtx, renderSlot, unref, resolveDirective, withDirectives, openBlock, createBlock, createTextVNode, provide, onErrorCaptured, onServerPrefetch, shallowReactive, reactive, effectScope, defineAsyncComponent, getCurrentScope, toRef, h, isReadonly, isRef, isShallow, isReactive, toRaw } from 'vue';
import { p as parseURL, e as encodePath, k as decodePath, l as hasProtocol, m as isScriptProtocol, n as joinURL, w as withQuery, s as sanitizeStatusCode, o as getContext, $ as $fetch, c as createError$1, q as isEqual, r as stringifyParsedURL, t as stringifyQuery, v as parseQuery, x as defu } from '../nitro/nitro.mjs';
import { b as baseURL } from '../routes/renderer.mjs';
import { ssrRenderVNode, ssrRenderSlot, ssrRenderAttrs, ssrRenderClass, ssrRenderStyle, ssrRenderAttr, ssrRenderList, ssrRenderComponent, ssrInterpolate, ssrGetDirectiveProps, ssrRenderSuspense } from 'vue/server-renderer';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

function flatHooks(configHooks, hooks = {}, parentName) {
	for (const key in configHooks) {
		const subHook = configHooks[key];
		const name = parentName ? `${parentName}:${key}` : key;
		if (typeof subHook === "object" && subHook !== null) flatHooks(subHook, hooks, name);
		else if (typeof subHook === "function") hooks[name] = subHook;
	}
	return hooks;
}
const createTask = /* @__PURE__ */ (() => {
	if (console.createTask) return console.createTask;
	const defaultTask = { run: (fn) => fn() };
	return () => defaultTask;
})();
function callHooks(hooks, args, startIndex, task) {
	for (let i = startIndex; i < hooks.length; i += 1) try {
		const result = task ? task.run(() => hooks[i](...args)) : hooks[i](...args);
		if (result && typeof result.then === "function") return Promise.resolve(result).then(() => callHooks(hooks, args, i + 1, task));
	} catch (error) {
		return Promise.reject(error);
	}
}
function serialTaskCaller(hooks, args, name) {
	if (hooks.length > 0) return callHooks(hooks, args, 0, createTask(name));
}
function parallelTaskCaller(hooks, args, name) {
	if (hooks.length > 0) {
		const task = createTask(name);
		return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
	}
}
function callEachWith(callbacks, arg0) {
	for (const callback of [...callbacks]) callback(arg0);
}
var Hookable = class {
	_hooks;
	_before;
	_after;
	_deprecatedHooks;
	_deprecatedMessages;
	constructor() {
		this._hooks = {};
		this._before = void 0;
		this._after = void 0;
		this._deprecatedMessages = void 0;
		this._deprecatedHooks = {};
		this.hook = this.hook.bind(this);
		this.callHook = this.callHook.bind(this);
		this.callHookWith = this.callHookWith.bind(this);
	}
	hook(name, function_, options = {}) {
		if (!name || typeof function_ !== "function") return () => {};
		const originalName = name;
		let dep;
		while (this._deprecatedHooks[name]) {
			dep = this._deprecatedHooks[name];
			name = dep.to;
		}
		if (dep && !options.allowDeprecated) {
			let message = dep.message;
			if (!message) message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
			if (!this._deprecatedMessages) this._deprecatedMessages = /* @__PURE__ */ new Set();
			if (!this._deprecatedMessages.has(message)) {
				console.warn(message);
				this._deprecatedMessages.add(message);
			}
		}
		if (!function_.name) try {
			Object.defineProperty(function_, "name", {
				get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
				configurable: true
			});
		} catch {}
		this._hooks[name] = this._hooks[name] || [];
		this._hooks[name].push(function_);
		return () => {
			if (function_) {
				this.removeHook(name, function_);
				function_ = void 0;
			}
		};
	}
	hookOnce(name, function_) {
		let _unreg;
		let _function = (...arguments_) => {
			if (typeof _unreg === "function") _unreg();
			_unreg = void 0;
			_function = void 0;
			return function_(...arguments_);
		};
		_unreg = this.hook(name, _function);
		return _unreg;
	}
	removeHook(name, function_) {
		const hooks = this._hooks[name];
		if (hooks) {
			const index = hooks.indexOf(function_);
			if (index !== -1) hooks.splice(index, 1);
			if (hooks.length === 0) this._hooks[name] = void 0;
		}
	}
	clearHook(name) {
		this._hooks[name] = void 0;
	}
	deprecateHook(name, deprecated) {
		this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
		const _hooks = this._hooks[name] || [];
		this._hooks[name] = void 0;
		for (const hook of _hooks) this.hook(name, hook);
	}
	deprecateHooks(deprecatedHooks) {
		for (const name in deprecatedHooks) this.deprecateHook(name, deprecatedHooks[name]);
	}
	addHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		const removeFns = Object.keys(hooks).map((key) => this.hook(key, hooks[key]));
		return () => {
			for (const unreg of removeFns) unreg();
			removeFns.length = 0;
		};
	}
	removeHooks(configHooks) {
		const hooks = flatHooks(configHooks);
		for (const key in hooks) this.removeHook(key, hooks[key]);
	}
	removeAllHooks() {
		this._hooks = {};
	}
	callHook(name, ...args) {
		return this.callHookWith(serialTaskCaller, name, args);
	}
	callHookParallel(name, ...args) {
		return this.callHookWith(parallelTaskCaller, name, args);
	}
	callHookWith(caller, name, args) {
		const event = this._before || this._after ? {
			name,
			args,
			context: {}
		} : void 0;
		if (this._before) callEachWith(this._before, event);
		const result = caller(this._hooks[name] ? [...this._hooks[name]] : [], args, name);
		if (result instanceof Promise) return result.finally(() => {
			if (this._after && event) callEachWith(this._after, event);
		});
		if (this._after && event) callEachWith(this._after, event);
		return result;
	}
	beforeEach(function_) {
		this._before = this._before || [];
		this._before.push(function_);
		return () => {
			if (this._before !== void 0) {
				const index = this._before.indexOf(function_);
				if (index !== -1) this._before.splice(index, 1);
			}
		};
	}
	afterEach(function_) {
		this._after = this._after || [];
		this._after.push(function_);
		return () => {
			if (this._after !== void 0) {
				const index = this._after.indexOf(function_);
				if (index !== -1) this._after.splice(index, 1);
			}
		};
	}
};
function createHooks() {
	return new Hookable();
}

if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch.create({
    baseURL: baseURL()
  });
}
if (!("global" in globalThis)) {
  globalThis.global = globalThis;
}
const nuxtLinkDefaults = { "componentName": "NuxtLink" };
const appId = "nuxt-app";
function getNuxtAppCtx(id = appId) {
  return getContext(id, {
    asyncContext: false
  });
}
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options) {
  let hydratingCount = 0;
  const nuxtApp = {
    _id: options.id || appId || "nuxt-app",
    _scope: effectScope(),
    provide: void 0,
    versions: {
      get nuxt() {
        return "4.4.7";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: shallowReactive({
      ...options.ssrContext?.payload || {},
      data: shallowReactive({}),
      state: reactive({}),
      once: /* @__PURE__ */ new Set(),
      _errors: shallowReactive({})
    }),
    static: {
      data: {}
    },
    runWithContext(fn) {
      if (nuxtApp._scope.active && !getCurrentScope()) {
        return nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn));
      }
      return callWithNuxt(nuxtApp, fn);
    },
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: shallowReactive({}),
    _state: shallowReactive({}),
    _payloadRevivers: {},
    ...options
  };
  {
    nuxtApp.payload.serverRendered = true;
  }
  if (nuxtApp.ssrContext) {
    nuxtApp.payload.path = nuxtApp.ssrContext.url;
    nuxtApp.ssrContext.nuxt = nuxtApp;
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: nuxtApp.ssrContext.runtimeConfig.public,
      app: nuxtApp.ssrContext.runtimeConfig.app
    };
  }
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    const contextCaller = async function(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    };
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  const runtimeConfig = options.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
function registerPluginHooks(nuxtApp, plugin) {
  if (plugin.hooks) {
    nuxtApp.hooks.addHooks(plugin.hooks);
  }
}
async function applyPlugin(nuxtApp, plugin) {
  if (typeof plugin === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  const resolvedPlugins = /* @__PURE__ */ new Set();
  const unresolvedPlugins = [];
  const parallels = [];
  let error = void 0;
  let promiseDepth = 0;
  async function executePlugin(plugin) {
    const unresolvedPluginsForThisPlugin = plugin.dependsOn?.filter((name) => plugins2.some((p) => p._name === name) && !resolvedPlugins.has(name)) ?? [];
    if (unresolvedPluginsForThisPlugin.length > 0) {
      unresolvedPlugins.push([new Set(unresolvedPluginsForThisPlugin), plugin]);
    } else {
      const promise = applyPlugin(nuxtApp, plugin).then(async () => {
        if (plugin._name) {
          resolvedPlugins.add(plugin._name);
          await Promise.all(unresolvedPlugins.map(async ([dependsOn, unexecutedPlugin]) => {
            if (dependsOn.has(plugin._name)) {
              dependsOn.delete(plugin._name);
              if (dependsOn.size === 0) {
                promiseDepth++;
                await executePlugin(unexecutedPlugin);
              }
            }
          }));
        }
      }).catch((e) => {
        if (!plugin.parallel && !nuxtApp.payload.error) {
          throw e;
        }
        error ||= e;
      });
      if (plugin.parallel) {
        parallels.push(promise);
      } else {
        await promise;
      }
    }
  }
  for (const plugin of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin.env?.islands === false) {
      continue;
    }
    registerPluginHooks(nuxtApp, plugin);
  }
  for (const plugin of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin.env?.islands === false) {
      continue;
    }
    await executePlugin(plugin);
  }
  await Promise.all(parallels);
  if (promiseDepth) {
    for (let i = 0; i < promiseDepth; i++) {
      await Promise.all(parallels);
    }
  }
  if (error) {
    throw nuxtApp.payload.error || error;
  }
}
// @__NO_SIDE_EFFECTS__
function defineNuxtPlugin(plugin) {
  if (typeof plugin === "function") {
    return plugin;
  }
  const _name = plugin._name || plugin.name;
  delete plugin.name;
  return Object.assign(plugin.setup || (() => {
  }), plugin, { [NuxtPluginIndicator]: true, _name });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => setup();
  const nuxtAppCtx = getNuxtAppCtx(nuxt._id);
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
function tryUseNuxtApp(id) {
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = getCurrentInstance()?.appContext.app.$nuxt;
  }
  nuxtAppInstance ||= getNuxtAppCtx(id).tryUse();
  return nuxtAppInstance || null;
}
function useNuxtApp(id) {
  const nuxtAppInstance = tryUseNuxtApp(id);
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
// @__NO_SIDE_EFFECTS__
function useRuntimeConfig(_event) {
  return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
const PageRouteSymbol = /* @__PURE__ */ Symbol("route");
globalThis._importMeta_.url.replace(/\/app\/.*$/, "/");
const useRouter = () => {
  return useNuxtApp()?.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, useNuxtApp()._route);
  }
  return useNuxtApp()._route;
};
// @__NO_SIDE_EFFECTS__
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const isProcessingMiddleware = () => {
  try {
    if (useNuxtApp()._processingMiddleware) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};
const HTML_ATTR_UNSAFE_RE = /[&"'<>]/g;
const HTML_ATTR_ENCODE_MAP = {
  "&": "%26",
  '"': "%22",
  "'": "%27",
  "<": "%3C",
  ">": "%3E"
};
function encodeForHtmlAttr(value) {
  return value.replace(HTML_ATTR_UNSAFE_RE, (c) => HTML_ATTR_ENCODE_MAP[c]);
}
const navigateTo = (to, options) => {
  to ||= "/";
  const toPath = typeof to === "string" ? to : "path" in to ? resolveRouteObject(to) : useRouter().resolve(to).href;
  const isExternalHost = hasProtocol(toPath, { acceptRelative: true });
  const isExternal = options?.external || isExternalHost;
  if (isExternal) {
    if (!options?.external) {
      throw new Error("Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`.");
    }
    const { protocol } = new URL(toPath, "http://localhost");
    if (protocol && isScriptProtocol(protocol)) {
      throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`);
    }
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
      const redirect = async function(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedHeader = encodeURL(location2, isExternalHost);
        const encodedLoc = encodeForHtmlAttr(encodedHeader);
        nuxtApp.ssrContext["~renderResponse"] = {
          statusCode: sanitizeStatusCode(options?.redirectCode || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: encodedHeader }
        };
        return response;
      };
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    nuxtApp._scope.stop();
    if (options?.replace) {
      (void 0).replace(toPath);
    } else {
      (void 0).href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  const encodedTo = typeof to === "string" ? encodeRoutePath(to) : to;
  return options?.replace ? router.replace(encodedTo) : router.push(encodedTo);
};
function resolveRouteObject(to) {
  return withQuery(to.path || "", to.query || {}) + (to.hash || "");
}
function encodeURL(location2, isExternalHost = false) {
  const url = new URL(location2, "http://localhost");
  if (!isExternalHost) {
    const pathname = url.pathname.replace(/^\/{2,}/, "/");
    return pathname + url.search + url.hash;
  }
  if (location2.startsWith("//")) {
    return url.toString().replace(url.protocol, "");
  }
  return url.toString();
}
function encodeRoutePath(url) {
  const parsed = parseURL(url);
  return encodePath(decodePath(parsed.pathname)) + parsed.search + parsed.hash;
}
const NUXT_ERROR_SIGNATURE = "__nuxt_error";
const useError = /* @__NO_SIDE_EFFECTS__ */ () => toRef(useNuxtApp().payload, "error");
const showError = (error) => {
  const nuxtError = createError(error);
  try {
    const error2 = /* @__PURE__ */ useError();
    if (false) ;
    error2.value ||= nuxtError;
  } catch {
    throw nuxtError;
  }
  return nuxtError;
};
const isNuxtError = (error) => !!error && typeof error === "object" && NUXT_ERROR_SIGNATURE in error;
const createError = (error) => {
  if (typeof error !== "string" && error.statusText) {
    error.message ??= error.statusText;
  }
  const nuxtError = createError$1(error);
  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  });
  Object.defineProperty(nuxtError, "status", {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    get: () => nuxtError.statusCode,
    configurable: true
  });
  Object.defineProperty(nuxtError, "statusText", {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    get: () => nuxtError.statusMessage,
    configurable: true
  });
  return nuxtError;
};
function freezeHead(head) {
  const realPush = head.push;
  head.push = () => ({ dispose: () => {
  }, patch: () => {
  }, _poll: () => {
  } });
  return () => {
    head.push = realPush;
  };
}
const unhead_iaNBKD85E0BdZlEjRbBcefzt3E0mGDGmWlNHfw1nbdw = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  enforce: "pre",
  setup(nuxtApp) {
    const head = nuxtApp.ssrContext.head;
    if (nuxtApp.ssrContext.islandContext) {
      const unfreeze = freezeHead(head);
      nuxtApp.hooks.hookOnce("app:created", unfreeze);
    }
    nuxtApp.vueApp.use(head);
  }
});
const matcher = (m, p) => {
  return [];
};
const _routeRulesMatcher = (path) => defu({}, ...matcher("", typeof path === "string" ? path.toLowerCase() : path).map((r) => r.data).reverse());
const routeRulesMatcher = _routeRulesMatcher;
function getRouteRules(arg) {
  const path = typeof arg === "string" ? arg : arg.path;
  try {
    return routeRulesMatcher(path.toLowerCase());
  } catch (e) {
    console.error("[nuxt] Error matching route rules.", e);
    return {};
  }
}
const manifest_45route_45rule = /* @__PURE__ */ defineNuxtRouteMiddleware((to) => {
  {
    return;
  }
});
const globalMiddleware = [
  manifest_45route_45rule
];
function getRouteFromPath(fullPath) {
  const route = fullPath && typeof fullPath === "object" ? fullPath : {};
  if (typeof fullPath === "object") {
    fullPath = stringifyParsedURL({
      pathname: fullPath.path || "",
      search: stringifyQuery(fullPath.query || {}),
      hash: fullPath.hash || ""
    });
  }
  const url = new URL(fullPath.toString(), "http://localhost");
  return {
    path: url.pathname,
    fullPath,
    query: parseQuery(url.search),
    hash: url.hash,
    // stub properties for compat with vue-router
    params: route.params || {},
    name: void 0,
    matched: route.matched || [],
    redirectedFrom: void 0,
    meta: route.meta || {},
    href: fullPath
  };
}
const router_bUAODN0ZPdItqvM8BVWW5DArQn1SR1couZ4T8AG1uBU = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  setup(nuxtApp) {
    const initialURL = nuxtApp.ssrContext.url;
    const routes = [];
    const hooks = {
      "navigate:before": [],
      "resolve:before": [],
      "navigate:after": [],
      "error": []
    };
    const registerHook = (hook, guard) => {
      hooks[hook].push(guard);
      return () => hooks[hook].splice(hooks[hook].indexOf(guard), 1);
    };
    (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
    const route = reactive(getRouteFromPath(initialURL));
    async function handleNavigation(url, replace) {
      try {
        const to = getRouteFromPath(url);
        for (const middleware of hooks["navigate:before"]) {
          const result = await middleware(to, route);
          if (result === false || result instanceof Error) {
            return;
          }
          if (typeof result === "string" && result.length) {
            return await handleNavigation(result, true);
          }
        }
        for (const handler of hooks["resolve:before"]) {
          await handler(to, route);
        }
        Object.assign(route, to);
        if (false) ;
        for (const middleware of hooks["navigate:after"]) {
          await middleware(to, route);
        }
      } catch (err) {
        for (const handler of hooks.error) {
          await handler(err);
        }
      }
    }
    const currentRoute = computed(() => route);
    const router = {
      currentRoute,
      isReady: () => Promise.resolve(),
      // These options provide a similar API to vue-router but have no effect
      options: {},
      install: () => Promise.resolve(),
      // Navigation
      push: (url) => handleNavigation(url),
      replace: (url) => handleNavigation(url),
      back: () => (void 0).history.go(-1),
      go: (delta) => (void 0).history.go(delta),
      forward: () => (void 0).history.go(1),
      // Guards
      beforeResolve: (guard) => registerHook("resolve:before", guard),
      beforeEach: (guard) => registerHook("navigate:before", guard),
      afterEach: (guard) => registerHook("navigate:after", guard),
      onError: (handler) => registerHook("error", handler),
      // Routes
      resolve: getRouteFromPath,
      addRoute: (parentName, route2) => {
        routes.push(route2);
      },
      getRoutes: () => routes,
      hasRoute: (name) => routes.some((route2) => route2.name === name),
      removeRoute: (name) => {
        const index = routes.findIndex((route2) => route2.name === name);
        if (index !== -1) {
          routes.splice(index, 1);
        }
      }
    };
    nuxtApp.vueApp.component("RouterLink", defineComponent({
      functional: true,
      props: {
        to: {
          type: String,
          required: true
        },
        custom: Boolean,
        replace: Boolean,
        // Not implemented
        activeClass: String,
        exactActiveClass: String,
        ariaCurrentValue: String
      },
      setup: (props, { slots }) => {
        const navigate = () => handleNavigation(props.to, props.replace);
        return () => {
          const route2 = router.resolve(props.to);
          return props.custom ? slots.default?.({ href: props.to, navigate, route: route2 }) : h("a", { href: props.to, onClick: (e) => {
            e.preventDefault();
            return navigate();
          } }, slots);
        };
      }
    }));
    nuxtApp._route = route;
    nuxtApp._middleware ||= {
      global: [],
      named: {}
    };
    const initialLayout = nuxtApp.payload.state._layout;
    const initialLayoutProps = nuxtApp.payload.state._layoutProps;
    nuxtApp.hooks.hookOnce("app:created", async () => {
      router.beforeEach(async (to, from) => {
        to.meta = reactive(to.meta || {});
        if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
          to.meta.layout = initialLayout;
          to.meta.layoutProps = initialLayoutProps;
        }
        nuxtApp._processingMiddleware = true;
        if (!nuxtApp.ssrContext?.islandContext) {
          const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
          const routeRules = getRouteRules({ path: to.path });
          if (routeRules.appMiddleware) {
            for (const key in routeRules.appMiddleware) {
              const guard = nuxtApp._middleware.named[key];
              if (!guard) {
                continue;
              }
              if (routeRules.appMiddleware[key]) {
                middlewareEntries.add(guard);
              } else {
                middlewareEntries.delete(guard);
              }
            }
          }
          for (const middleware of middlewareEntries) {
            const result = await nuxtApp.runWithContext(() => middleware(to, from));
            {
              if (result === false || result instanceof Error) {
                const error = result || createError$1({
                  status: 404,
                  statusText: `Page Not Found: ${initialURL}`,
                  data: {
                    path: initialURL
                  }
                });
                delete nuxtApp._processingMiddleware;
                return nuxtApp.runWithContext(() => showError(error));
              }
            }
            if (result === true) {
              continue;
            }
            if (result || result === false) {
              return result;
            }
          }
        }
      });
      router.afterEach(() => {
        delete nuxtApp._processingMiddleware;
      });
      await router.replace(initialURL);
      if (!isEqual(route.fullPath, initialURL)) {
        await nuxtApp.runWithContext(() => navigateTo(route.fullPath));
      }
    });
    return {
      provide: {
        route,
        router
      }
    };
  }
});
const ATTR = {
  /** Skip this element and its subtree entirely (leave content untouched). */
  ignore: "data-skeleton-ignore",
  /** Keep the original content visible inside an otherwise-skeletonized tree. */
  keep: "data-skeleton-keep",
  /** Force-replace this element with a bone of an (optional) explicit kind. */
  replace: "data-skeleton-replace",
  /** Collapse this element and its subtree into a single merged bone. */
  union: "data-skeleton-union",
  /** Apply only the shimmer overlay, keeping the original content visible. */
  shimmer: "data-skeleton-shimmer"
};
const CLASS = {
  /** A painted leaf bone. */
  bone: "sk-bone",
  /** Shimmer-only treatment (content stays visible). */
  shimmerOnly: "sk-shimmer-only",
  /** Host wrapper element (uses `display: contents`). */
  host: "sk-host",
  /** Host root of a `<Skeletonizer>` in active mode. */
  active: "sk-active",
  /** Prefix for per-kind modifier classes, e.g. `sk-bone--avatar`. */
  bonePrefix: "sk-bone--",
  /** Prefix for animation classes set on the host, e.g. `sk-anim-wave`. */
  animPrefix: "sk-anim-"
};
function toggleAttr(el, attr, value) {
  if (value === false) {
    el.removeAttribute(attr);
    return;
  }
  el.setAttribute(attr, value === true || value == null ? "" : String(value));
}
function attrDirective(attr) {
  const apply = (el, binding) => {
    toggleAttr(el, attr, binding.value);
  };
  return {
    // Run before children mount so the engine sees the attribute on first scan.
    created: apply,
    mounted: apply,
    updated: apply,
    unmounted(el) {
      el.removeAttribute(attr);
    }
  };
}
const vSkeletonIgnore = attrDirective(ATTR.ignore);
const vSkeletonKeep = attrDirective(ATTR.keep);
const vSkeletonReplace = attrDirective(ATTR.replace);
const vSkeletonUnion = attrDirective(ATTR.union);
const vSkeletonShimmer = attrDirective(ATTR.shimmer);
const directives = {
  "skeleton-ignore": vSkeletonIgnore,
  "skeleton-keep": vSkeletonKeep,
  "skeleton-replace": vSkeletonReplace,
  "skeleton-union": vSkeletonUnion,
  "skeleton-shimmer": vSkeletonShimmer
};
function registerDirectives(app) {
  for (const [name, directive] of Object.entries(directives)) {
    app.directive(name, directive);
  }
}
const registered = /* @__PURE__ */ new Map();
function registerAnimation(def) {
  registered.set(def.name, def.css);
  return;
}
function animationClass(name) {
  return `${CLASS.animPrefix}${name}`;
}
const VAR = {
  baseColor: "--sk-base-color",
  highlightColor: "--sk-highlight-color",
  darkBaseColor: "--sk-dark-base-color",
  darkHighlightColor: "--sk-dark-highlight-color",
  borderRadius: "--sk-radius",
  opacity: "--sk-opacity"
};
function setThemeTokens(tokens, target) {
  if (!target) return;
  const root = target ?? (void 0).documentElement;
  if (tokens.baseColor !== void 0) root.style.setProperty(VAR.baseColor, tokens.baseColor);
  if (tokens.highlightColor !== void 0) root.style.setProperty(VAR.highlightColor, tokens.highlightColor);
  if (tokens.darkBaseColor !== void 0) root.style.setProperty(VAR.darkBaseColor, tokens.darkBaseColor);
  if (tokens.darkHighlightColor !== void 0) root.style.setProperty(VAR.darkHighlightColor, tokens.darkHighlightColor);
  if (tokens.borderRadius !== void 0) root.style.setProperty(VAR.borderRadius, tokens.borderRadius);
  if (tokens.opacity !== void 0) root.style.setProperty(VAR.opacity, String(tokens.opacity));
}
function createSkeletonizerStore(config) {
  const reactiveConfig = reactive({ ...config });
  const enabled = ref(config.enabled);
  const hosts = /* @__PURE__ */ new Set();
  let idSeq = 0;
  const stats = reactive({
    hosts: 0,
    bones: 0,
    ignored: 0,
    scans: 0,
    lastScanMs: 0,
    enabled: enabled.value
  });
  const recompute = () => {
    let bones = 0;
    let ignored = 0;
    let lastScanMs = 0;
    for (const host of hosts) {
      const r = host.report();
      bones += r.bones;
      ignored += r.ignored;
      lastScanMs = Math.max(lastScanMs, r.lastScanMs);
    }
    stats.hosts = hosts.size;
    stats.bones = bones;
    stats.ignored = ignored;
    stats.lastScanMs = lastScanMs;
    stats.enabled = enabled.value;
  };
  const refresh = () => {
    for (const host of hosts) host.scan();
    stats.scans++;
    recompute();
  };
  const store = {
    config: reactiveConfig,
    enabled,
    isEnabled: computed(() => enabled.value),
    stats,
    enable() {
      enabled.value = true;
      stats.enabled = true;
    },
    disable() {
      enabled.value = false;
      stats.enabled = false;
    },
    toggle() {
      enabled.value = !enabled.value;
      stats.enabled = enabled.value;
      return enabled.value;
    },
    refresh,
    scan: refresh,
    setTheme(tokens, target) {
      if (tokens.baseColor !== void 0) reactiveConfig.baseColor = tokens.baseColor;
      if (tokens.highlightColor !== void 0) reactiveConfig.highlightColor = tokens.highlightColor;
      if (tokens.darkBaseColor !== void 0) reactiveConfig.darkBaseColor = tokens.darkBaseColor;
      if (tokens.darkHighlightColor !== void 0) reactiveConfig.darkHighlightColor = tokens.darkHighlightColor;
      if (tokens.borderRadius !== void 0) reactiveConfig.borderRadius = tokens.borderRadius;
      if (tokens.opacity !== void 0) reactiveConfig.opacity = tokens.opacity;
      setThemeTokens(tokens, target);
    },
    setAnimation(animation) {
      reactiveConfig.animation = animation;
    },
    registerAnimation(def) {
      registerAnimation(def);
    },
    _hosts: hosts,
    _register(host) {
      hosts.add(host);
      recompute();
    },
    _unregister(host) {
      hosts.delete(host);
      recompute();
    },
    _recompute: recompute,
    _nextId: () => ++idSeq
  };
  return store;
}
const SKELETONIZER_KEY = /* @__PURE__ */ Symbol("nuxt-skeletonizer");
let activeStore = null;
function setActiveStore(store) {
  activeStore = store;
}
function getActiveStore() {
  return activeStore;
}
const plugin_QYbH7JgJe2A4uRsk6lXsyZ_ceaI1tbKYZcZM9TBjXMQ = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt-skeletonizer",
  // Run early so the store/directives exist before components mount.
  enforce: "pre",
  setup(nuxtApp) {
    const config = (/* @__PURE__ */ useRuntimeConfig()).public.skeletonizer;
    const store = createSkeletonizerStore(config);
    setActiveStore(store);
    nuxtApp.vueApp.provide(SKELETONIZER_KEY, store);
    registerDirectives(nuxtApp.vueApp);
    return {
      provide: {
        skeletonizer: store
      }
    };
  }
});
function definePayloadReducer(name, reduce) {
  {
    useNuxtApp().ssrContext["~payloadReducers"][name] = reduce;
  }
}
const reducers = [
  ["NuxtError", (data) => isNuxtError(data) && data.toJSON()],
  ["EmptyShallowRef", (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["EmptyRef", (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["ShallowRef", (data) => isRef(data) && isShallow(data) && data.value],
  ["ShallowReactive", (data) => isReactive(data) && isShallow(data) && toRaw(data)],
  ["Ref", (data) => isRef(data) && data.value],
  ["Reactive", (data) => isReactive(data) && toRaw(data)]
];
const revive_payload_server_Rp_g8NljhKpOjf6hgSLZj_me1dqT3r7lMZ5ghBb2kPo = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const [reducer, fn] of reducers) {
      definePayloadReducer(reducer, fn);
    }
  }
});
const components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8 = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components"
});
const plugins = [
  unhead_iaNBKD85E0BdZlEjRbBcefzt3E0mGDGmWlNHfw1nbdw,
  router_bUAODN0ZPdItqvM8BVWW5DArQn1SR1couZ4T8AG1uBU,
  plugin_QYbH7JgJe2A4uRsk6lXsyZ_ceaI1tbKYZcZM9TBjXMQ,
  revive_payload_server_Rp_g8NljhKpOjf6hgSLZj_me1dqT3r7lMZ5ghBb2kPo,
  components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8
];
const _sfc_main$a = /* @__PURE__ */ defineComponent({
  ...{ name: "Skeletonizer", inheritAttrs: false },
  __name: "Skeletonizer",
  __ssrInlineRender: true,
  props: {
    enabled: { type: Boolean, default: void 0 },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 },
    autoScan: { type: Boolean, default: void 0 },
    theme: { default: void 0 },
    tag: { default: "div" }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const store = inject(SKELETONIZER_KEY, null) ?? getActiveStore();
    const root = ref(null);
    const lastResult = ref({ bones: 0, ignored: 0, lastScanMs: 0 });
    const active = computed(() => {
      if (props.enabled !== void 0) return props.enabled;
      return store ? store.isEnabled.value : false;
    });
    const effectiveAnimation = computed(
      () => props.animation ?? store?.config.animation ?? "wave"
    );
    const effectiveShimmer = computed(
      () => props.shimmer ?? store?.config.shimmer ?? true
    );
    const effectiveAutoScan = computed(
      () => props.autoScan ?? store?.config.autoScan ?? true
    );
    const hostClass = computed(() => [
      CLASS.host,
      {
        [CLASS.active]: active.value,
        [animationClass(effectiveShimmer.value ? effectiveAnimation.value : "none")]: active.value
      }
    ]);
    function doScan() {
      return;
    }
    function restore() {
      lastResult.value = { bones: 0, ignored: 0, lastScanMs: 0 };
      store?._recompute();
    }
    watch(active, (isActive) => {
      if (!root.value) return;
      if (isActive) {
        nextTick(() => {
          if (effectiveAutoScan.value && root.value) ;
        });
      } else {
        restore();
      }
    });
    watch(
      () => props.theme,
      (theme) => {
        if (theme && root.value) setThemeTokens(theme, root.value);
      },
      { deep: true }
    );
    __expose({ scan: doScan, restore, active });
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderVNode(_push, createVNode(resolveDynamicComponent(props.tag), mergeProps({
        ref_key: "root",
        ref: root,
        class: hostClass.value,
        "aria-busy": active.value || void 0
      }, _ctx.$attrs, _attrs), {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
          } else {
            return [
              renderSlot(_ctx.$slots, "default")
            ];
          }
        }),
        _: 3
      }), _parent);
    };
  }
});
const _sfc_setup$a = _sfc_main$a.setup;
_sfc_main$a.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/Skeletonizer.vue");
  return _sfc_setup$a ? _sfc_setup$a(props, ctx) : void 0;
};
const __nuxt_component_0 = Object.assign(_sfc_main$a, { __name: "Skeletonizer" });
function cssSize(value) {
  if (value === void 0 || value === null) return void 0;
  return typeof value === "number" ? `${value}px` : value;
}
function useSkeletonStore() {
  return inject(SKELETONIZER_KEY, null) ?? getActiveStore();
}
const _sfc_main$9 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonAvatar" },
  __name: "SkeletonAvatar",
  __ssrInlineRender: true,
  props: {
    size: { default: 40 },
    shape: { default: "circle" },
    radius: { default: "0.5rem" },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const store = useSkeletonStore();
    const anim = computed(() => {
      const shimmer = props.shimmer ?? store?.config.shimmer ?? true;
      if (!shimmer) return "none";
      return props.animation ?? store?.config.animation ?? "wave";
    });
    const style = computed(() => ({
      width: cssSize(props.size),
      height: cssSize(props.size),
      borderRadius: props.shape === "circle" ? "9999px" : cssSize(props.radius),
      flex: "0 0 auto"
    }));
    const kind = computed(() => props.shape === "circle" ? "avatar" : "image");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: [unref(CLASS).host, unref(animationClass)(anim.value)],
        "aria-hidden": "true"
      }, _attrs))}><span class="${ssrRenderClass([unref(CLASS).bone, `${unref(CLASS).bonePrefix}${kind.value}`])}" style="${ssrRenderStyle(style.value)}"${ssrRenderAttr("data-sk-bone", kind.value)}></span></span>`);
    };
  }
});
const _sfc_setup$9 = _sfc_main$9.setup;
_sfc_main$9.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonAvatar.vue");
  return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
const SkeletonAvatar = Object.assign(_sfc_main$9, { __name: "SkeletonAvatar" });
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonBlock" },
  __name: "SkeletonBlock",
  __ssrInlineRender: true,
  props: {
    width: { default: "100%" },
    height: { default: "1rem" },
    radius: { default: void 0 },
    circle: { type: Boolean, default: false },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 },
    tag: { default: "span" }
  },
  setup(__props) {
    const props = __props;
    const store = useSkeletonStore();
    const anim = computed(() => {
      const shimmer = props.shimmer ?? store?.config.shimmer ?? true;
      if (!shimmer) return "none";
      return props.animation ?? store?.config.animation ?? "wave";
    });
    const style = computed(() => ({
      width: cssSize(props.width),
      height: cssSize(props.height),
      borderRadius: props.circle ? "9999px" : cssSize(props.radius)
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: [unref(CLASS).host, unref(animationClass)(anim.value)],
        "aria-hidden": "true"
      }, _attrs))}>`);
      ssrRenderVNode(_push, createVNode(resolveDynamicComponent(props.tag), {
        class: [unref(CLASS).bone, `${unref(CLASS).bonePrefix}block`],
        style: style.value,
        "data-sk-bone": "block"
      }, null), _parent);
      _push(`</span>`);
    };
  }
});
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonBlock.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const SkeletonBlock = Object.assign(_sfc_main$8, { __name: "SkeletonBlock" });
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonButton" },
  __name: "SkeletonButton",
  __ssrInlineRender: true,
  props: {
    width: { default: 96 },
    height: { default: 38 },
    radius: { default: "0.5rem" },
    block: { type: Boolean, default: false },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const store = useSkeletonStore();
    const anim = computed(() => {
      const shimmer = props.shimmer ?? store?.config.shimmer ?? true;
      if (!shimmer) return "none";
      return props.animation ?? store?.config.animation ?? "wave";
    });
    const style = computed(() => ({
      width: props.block ? "100%" : cssSize(props.width),
      height: cssSize(props.height),
      borderRadius: cssSize(props.radius)
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: [unref(CLASS).host, unref(animationClass)(anim.value)],
        "aria-hidden": "true"
      }, _attrs))}><span class="${ssrRenderClass([unref(CLASS).bone, `${unref(CLASS).bonePrefix}button`])}" style="${ssrRenderStyle(style.value)}" data-sk-bone="button"></span></span>`);
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonButton.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const SkeletonButton = Object.assign(_sfc_main$7, { __name: "SkeletonButton" });
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonImage" },
  __name: "SkeletonImage",
  __ssrInlineRender: true,
  props: {
    width: { default: "100%" },
    height: { default: void 0 },
    aspectRatio: { default: "16 / 9" },
    radius: { default: "0.5rem" },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const store = useSkeletonStore();
    const anim = computed(() => {
      const shimmer = props.shimmer ?? store?.config.shimmer ?? true;
      if (!shimmer) return "none";
      return props.animation ?? store?.config.animation ?? "wave";
    });
    const style = computed(() => ({
      width: cssSize(props.width),
      height: cssSize(props.height),
      aspectRatio: props.height ? void 0 : String(props.aspectRatio),
      borderRadius: cssSize(props.radius)
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: [unref(CLASS).host, unref(animationClass)(anim.value)],
        "aria-hidden": "true"
      }, _attrs))}><span class="${ssrRenderClass([unref(CLASS).bone, `${unref(CLASS).bonePrefix}image`])}" style="${ssrRenderStyle(style.value)}" data-sk-bone="image"></span></span>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonImage.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const SkeletonImage = Object.assign(_sfc_main$6, { __name: "SkeletonImage" });
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonText" },
  __name: "SkeletonText",
  __ssrInlineRender: true,
  props: {
    lines: { default: 3 },
    lineHeight: { default: "0.85rem" },
    gap: { default: "0.55rem" },
    lastLineWidth: { default: "60%" },
    width: { default: "100%" },
    radius: { default: void 0 },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const store = useSkeletonStore();
    const anim = computed(() => {
      const shimmer = props.shimmer ?? store?.config.shimmer ?? true;
      if (!shimmer) return "none";
      return props.animation ?? store?.config.animation ?? "wave";
    });
    const count = computed(() => Math.max(1, Math.floor(props.lines)));
    const containerStyle = computed(() => ({
      display: "flex",
      flexDirection: "column",
      gap: cssSize(props.gap),
      width: cssSize(props.width)
    }));
    function lineStyle(index) {
      const isLast = index === count.value - 1 && count.value > 1;
      return {
        height: cssSize(props.lineHeight),
        width: isLast ? cssSize(props.lastLineWidth) : "100%",
        borderRadius: cssSize(props.radius)
      };
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${ssrRenderAttrs(mergeProps({
        class: [unref(CLASS).host, unref(animationClass)(anim.value)],
        "aria-hidden": "true"
      }, _attrs))}><span style="${ssrRenderStyle(containerStyle.value)}"><!--[-->`);
      ssrRenderList(count.value, (i) => {
        _push(`<span class="${ssrRenderClass([unref(CLASS).bone, `${unref(CLASS).bonePrefix}text`])}" style="${ssrRenderStyle(lineStyle(i - 1))}" data-sk-bone="text"></span>`);
      });
      _push(`<!--]--></span></span>`);
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonText.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const SkeletonText = Object.assign(_sfc_main$5, { __name: "SkeletonText" });
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonCard" },
  __name: "SkeletonCard",
  __ssrInlineRender: true,
  props: {
    media: { type: Boolean, default: true },
    avatar: { type: Boolean, default: true },
    footer: { type: Boolean, default: false },
    lines: { default: 3 },
    width: { default: "100%" },
    padding: { default: "1rem" },
    radius: { default: "0.75rem" },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const cardStyle = computed(() => ({
      width: cssSize(props.width),
      borderRadius: cssSize(props.radius),
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }));
    const bodyStyle = computed(() => ({
      padding: cssSize(props.padding),
      display: "flex",
      flexDirection: "column",
      gap: "0.85rem"
    }));
    const headerStyle = {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem"
    };
    const forwarded = computed(() => ({
      animation: props.animation,
      shimmer: props.shimmer
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: "sk-card",
        style: cardStyle.value,
        "aria-hidden": "true"
      }, _attrs))}>`);
      if (props.media) {
        _push(ssrRenderComponent(SkeletonImage, mergeProps({ radius: 0 }, forwarded.value), null, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`<div style="${ssrRenderStyle(bodyStyle.value)}">`);
      if (props.avatar) {
        _push(`<div style="${ssrRenderStyle(headerStyle)}">`);
        _push(ssrRenderComponent(SkeletonAvatar, mergeProps({ size: 44 }, forwarded.value), null, _parent));
        _push(`<div style="${ssrRenderStyle({ "flex": "1 1 auto", "display": "flex", "flex-direction": "column", "gap": "0.4rem" })}">`);
        _push(ssrRenderComponent(SkeletonBlock, mergeProps({
          width: "55%",
          height: "0.9rem"
        }, forwarded.value), null, _parent));
        _push(ssrRenderComponent(SkeletonBlock, mergeProps({
          width: "35%",
          height: "0.75rem"
        }, forwarded.value), null, _parent));
        _push(`</div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(SkeletonText, mergeProps({
        lines: props.lines
      }, forwarded.value), null, _parent));
      if (props.footer) {
        _push(`<div style="${ssrRenderStyle({ "display": "flex", "gap": "0.5rem" })}">`);
        _push(ssrRenderComponent(SkeletonButton, forwarded.value, null, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonCard.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const __nuxt_component_1 = Object.assign(_sfc_main$4, { __name: "SkeletonCard" });
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  ...{ name: "SkeletonList" },
  __name: "SkeletonList",
  __ssrInlineRender: true,
  props: {
    items: { default: 5 },
    avatar: { type: Boolean, default: true },
    lines: { default: 2 },
    gap: { default: "1rem" },
    avatarSize: { default: 40 },
    animation: { default: void 0 },
    shimmer: { type: Boolean, default: void 0 }
  },
  setup(__props) {
    const props = __props;
    const count = computed(() => Math.max(1, Math.floor(props.items)));
    const lineCount = computed(() => Math.max(1, Math.floor(props.lines)));
    const listStyle = computed(() => ({
      display: "flex",
      flexDirection: "column",
      gap: cssSize(props.gap),
      width: "100%"
    }));
    const rowStyle = {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem"
    };
    const forwarded = computed(() => ({
      animation: props.animation,
      shimmer: props.shimmer
    }));
    function lineWidth(index) {
      return index === lineCount.value - 1 ? "50%" : "85%";
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: "sk-list",
        style: listStyle.value,
        "aria-hidden": "true"
      }, _attrs))}><!--[-->`);
      ssrRenderList(count.value, (row) => {
        _push(`<div style="${ssrRenderStyle(rowStyle)}">`);
        if (props.avatar) {
          _push(ssrRenderComponent(SkeletonAvatar, mergeProps({
            size: props.avatarSize
          }, { ref_for: true }, forwarded.value), null, _parent));
        } else {
          _push(`<!---->`);
        }
        _push(`<div style="${ssrRenderStyle({ "flex": "1 1 auto", "display": "flex", "flex-direction": "column", "gap": "0.45rem" })}"><!--[-->`);
        ssrRenderList(lineCount.value, (line) => {
          _push(ssrRenderComponent(SkeletonBlock, mergeProps({
            key: line,
            width: lineWidth(line - 1),
            height: "0.8rem"
          }, { ref_for: true }, forwarded.value), null, _parent));
        });
        _push(`<!--]--></div></div>`);
      });
      _push(`<!--]--></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../src/runtime/components/SkeletonList.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_2 = Object.assign(_sfc_main$3, { __name: "SkeletonList" });
function resolveStore() {
  const injected = inject(SKELETONIZER_KEY, null);
  const store = injected ?? getActiveStore();
  if (!store) {
    throw new Error(
      "[nuxt-skeletonizer] useSkeletonizer() was called before the plugin initialised. Ensure the module is registered in nuxt.config and that you call it within a component setup or Nuxt runtime context."
    );
  }
  return store;
}
function useSkeletonizer() {
  const store = resolveStore();
  return {
    enable: store.enable,
    disable: store.disable,
    toggle: store.toggle,
    isEnabled: computed(() => store.isEnabled.value),
    config: store.config,
    refresh: store.refresh,
    scan: store.scan,
    stats: store.stats,
    setTheme: store.setTheme,
    setAnimation: store.setAnimation,
    registerAnimation: store.registerAnimation
  };
}
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "app",
  __ssrInlineRender: true,
  setup(__props) {
    const skeletonizer = useSkeletonizer();
    const loading = ref(true);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Skeletonizer = __nuxt_component_0;
      const _component_SkeletonCard = __nuxt_component_1;
      const _component_SkeletonList = __nuxt_component_2;
      const _directive_skeleton_ignore = resolveDirective("skeleton-ignore");
      _push(`<main${ssrRenderAttrs(mergeProps({ style: { "max-width": "640px", "margin": "3rem auto", "font-family": "system-ui" } }, _attrs))}><h1>Nuxt Skeletonizer playground</h1><div style="${ssrRenderStyle({ "display": "flex", "gap": "0.5rem", "margin": "1rem 0" })}"><button> Show skeleton </button><button> Show content </button><button> Toggle global </button></div><p>Global enabled: ${ssrInterpolate(unref(skeletonizer).isEnabled.value)} · bones: ${ssrInterpolate(unref(skeletonizer).stats.bones)}</p>`);
      _push(ssrRenderComponent(_component_Skeletonizer, { enabled: unref(loading) }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<article style="${ssrRenderStyle({ "display": "flex", "gap": "1rem", "align-items": "center", "padding": "1rem", "border": "1px solid #eee", "border-radius": "12px" })}"${_scopeId}><img src="https://i.pravatar.cc/72" width="72" height="72" style="${ssrRenderStyle({ "border-radius": "9999px" })}"${_scopeId}><div${_scopeId}><h2 style="${ssrRenderStyle({ "margin": "0" })}"${_scopeId}> Jane Doe </h2><p style="${ssrRenderStyle({ "margin": "0.25rem 0 0", "color": "#555" })}"${_scopeId}> Principal engineer · loves skeletons that never shift the layout. </p><button${ssrRenderAttrs(mergeProps({ style: { "margin-top": "0.5rem" } }, ssrGetDirectiveProps(_ctx, _directive_skeleton_ignore)))}${_scopeId}> Always visible </button></div></article>`);
          } else {
            return [
              createVNode("article", { style: { "display": "flex", "gap": "1rem", "align-items": "center", "padding": "1rem", "border": "1px solid #eee", "border-radius": "12px" } }, [
                createVNode("img", {
                  src: "https://i.pravatar.cc/72",
                  width: "72",
                  height: "72",
                  style: { "border-radius": "9999px" }
                }),
                createVNode("div", null, [
                  createVNode("h2", { style: { "margin": "0" } }, " Jane Doe "),
                  createVNode("p", { style: { "margin": "0.25rem 0 0", "color": "#555" } }, " Principal engineer · loves skeletons that never shift the layout. "),
                  withDirectives((openBlock(), createBlock("button", { style: { "margin-top": "0.5rem" } }, [
                    createTextVNode(" Always visible ")
                  ])), [
                    [_directive_skeleton_ignore]
                  ])
                ])
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<h3 style="${ssrRenderStyle({ "margin-top": "2rem" })}"> Manual primitives </h3>`);
      _push(ssrRenderComponent(_component_SkeletonCard, {
        media: "",
        avatar: "",
        lines: 3,
        footer: ""
      }, null, _parent));
      _push(`<div style="${ssrRenderStyle({ "margin-top": "1rem" })}">`);
      _push(ssrRenderComponent(_component_SkeletonList, {
        items: 3,
        lines: 2
      }, null, _parent));
      _push(`</div></main>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    const status = Number(_error.statusCode || 500);
    const is404 = status === 404;
    const statusText = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = defineAsyncComponent(() => import('./error-404-D4TPzI4j.mjs'));
    const _Error = defineAsyncComponent(() => import('./error-500-Dc6pY28O.mjs'));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ status: unref(status), statusText: unref(statusText), statusCode: unref(status), statusMessage: unref(statusText), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../../node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = () => null;
    const nuxtApp = useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup", []);
    const error = /* @__PURE__ */ useError();
    const abortRender = error.value && !nuxtApp.ssrContext.error;
    function invokeAppErrorHandler(err, target, info) {
      const errorHandler = nuxtApp.vueApp.config.errorHandler;
      if (errorHandler && !errorHandler.__nuxt_default) {
        try {
          errorHandler(err, target, info);
        } catch (handlerError) {
          console.error("[nuxt] Error in `app.config.errorHandler`", handlerError);
        }
      }
    }
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info)?.catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        invokeAppErrorHandler(err, target, info);
        return false;
      }
    });
    const islandContext = nuxtApp.ssrContext.islandContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(abortRender)) {
            _push(`<div></div>`);
          } else if (unref(error)) {
            _push(ssrRenderComponent(unref(_sfc_main$1), { error: unref(error) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(_sfc_main$2), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../../node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(_sfc_main);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (error) {
      await nuxt.hooks.callHook("app:error", error);
      nuxt.payload.error ||= createError(error);
    }
    if (ssrContext && (ssrContext["~renderResponse"] || ssrContext._renderResponse)) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry_default = ((ssrContext) => entry(ssrContext));

export { useNuxtApp as a, useRuntimeConfig as b, nuxtLinkDefaults as c, entry_default as default, encodeRoutePath as e, navigateTo as n, resolveRouteObject as r, useRouter as u };
//# sourceMappingURL=server.mjs.map
