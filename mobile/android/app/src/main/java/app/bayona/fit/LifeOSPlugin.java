package app.bayona.fit;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(
    name = "LifeOS",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_CALENDAR }, alias = "calendar")
    }
)
public class LifeOSPlugin extends Plugin {

    private JSObject calendarPermissionPayload() {
        JSObject ret = new JSObject();
        PermissionState state = getPermissionState("calendar");
        ret.put("calendar", state == null ? "prompt" : state.toString().toLowerCase(Locale.ROOT));
        return ret;
    }

    @PluginMethod
    public void permissionStatus(PluginCall call) {
        call.resolve(calendarPermissionPayload());
    }

    @PluginMethod
    public void requestCalendarPermission(PluginCall call) {
        if (getPermissionState("calendar") == PermissionState.GRANTED) {
            call.resolve(calendarPermissionPayload());
            return;
        }
        requestPermissionForAlias("calendar", call, "calendarPermissionCallback");
    }

    @PermissionCallback
    private void calendarPermissionCallback(PluginCall call) {
        call.resolve(calendarPermissionPayload());
    }

    private static String localDate(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(TimeZone.getDefault());
        return f.format(new Date(ms));
    }

    private static String utcDate(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(ms));
    }

    private static String localTime(long ms) {
        SimpleDateFormat f = new SimpleDateFormat("HH:mm", Locale.US);
        f.setTimeZone(TimeZone.getDefault());
        return f.format(new Date(ms));
    }

    private static String safe(Cursor c, int index) {
        return index >= 0 && !c.isNull(index) ? c.getString(index) : "";
    }

    @PluginMethod
    public void calendarEvents(PluginCall call) {
        if (getPermissionState("calendar") != PermissionState.GRANTED) {
            call.reject("calendar_permission_required", "CALENDAR_PERMISSION_REQUIRED");
            return;
        }

        long now = System.currentTimeMillis();
        long defaultFrom = now - 7L * 24L * 60L * 60L * 1000L;
        long defaultTo = now + 30L * 24L * 60L * 60L * 1000L;
        long from = call.getLong("fromMs", defaultFrom);
        long to = call.getLong("toMs", defaultTo);
        if (to <= from) {
            call.reject("invalid_range", "INVALID_RANGE");
            return;
        }

        Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
        android.content.ContentUris.appendId(builder, from);
        android.content.ContentUris.appendId(builder, to);

        String[] projection = new String[] {
            CalendarContract.Instances.EVENT_ID,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.EVENT_LOCATION,
            CalendarContract.Instances.DESCRIPTION,
            CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
            CalendarContract.Instances.OWNER_ACCOUNT
        };

        JSArray rows = new JSArray();
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                builder.build(), projection, null, null, CalendarContract.Instances.BEGIN + " ASC"
            );
            if (cursor != null) {
                int eventIdIx = cursor.getColumnIndex(CalendarContract.Instances.EVENT_ID);
                int beginIx = cursor.getColumnIndex(CalendarContract.Instances.BEGIN);
                int endIx = cursor.getColumnIndex(CalendarContract.Instances.END);
                int allDayIx = cursor.getColumnIndex(CalendarContract.Instances.ALL_DAY);
                int titleIx = cursor.getColumnIndex(CalendarContract.Instances.TITLE);
                int locIx = cursor.getColumnIndex(CalendarContract.Instances.EVENT_LOCATION);
                int descIx = cursor.getColumnIndex(CalendarContract.Instances.DESCRIPTION);
                int calIx = cursor.getColumnIndex(CalendarContract.Instances.CALENDAR_DISPLAY_NAME);
                int ownerIx = cursor.getColumnIndex(CalendarContract.Instances.OWNER_ACCOUNT);

                while (cursor.moveToNext()) {
                    long begin = beginIx >= 0 ? cursor.getLong(beginIx) : 0L;
                    long end = endIx >= 0 ? cursor.getLong(endIx) : 0L;
                    boolean allDay = allDayIx >= 0 && cursor.getInt(allDayIx) == 1;
                    String eventId = eventIdIx >= 0 ? String.valueOf(cursor.getLong(eventIdIx)) : "event";

                    JSObject event = new JSObject();
                    event.put("externalId", eventId + ":" + begin);
                    event.put("eventId", eventId);
                    event.put("beginMs", begin);
                    event.put("endMs", end);
                    event.put("date", allDay ? utcDate(begin) : localDate(begin));
                    event.put("start", allDay ? null : localTime(begin));
                    event.put("end", allDay || end <= begin ? null : localTime(end));
                    event.put("allDay", allDay);
                    event.put("title", safe(cursor, titleIx));
                    event.put("location", safe(cursor, locIx));
                    event.put("notes", safe(cursor, descIx));
                    event.put("calendar", safe(cursor, calIx));
                    event.put("account", safe(cursor, ownerIx));
                    rows.put(event);
                }
            }

            JSObject ret = new JSObject();
            ret.put("events", rows);
            ret.put("fromMs", from);
            ret.put("toMs", to);
            ret.put("count", rows.length());
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("calendar_permission_required", "CALENDAR_PERMISSION_REQUIRED", e);
        } catch (Exception e) {
            call.reject("calendar_read_failed", "CALENDAR_READ_FAILED", e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    @PluginMethod
    public void openMap(PluginCall call) {
        String query = call.getString("query", "");
        if (query.trim().isEmpty()) {
            call.reject("location_required", "LOCATION_REQUIRED");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(query)));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            Intent web = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://www.google.com/maps/search/?api=1&query=" + Uri.encode(query)));
            getContext().startActivity(web);
            call.resolve();
        }
    }

    @PluginMethod
    public void openMusic(PluginCall call) {
        String query = call.getString("query", "workout");
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("spotify:search:" + Uri.encode(query)));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            Intent web = new Intent(Intent.ACTION_VIEW,
                Uri.parse("https://open.spotify.com/search/" + Uri.encode(query)));
            getContext().startActivity(web);
            call.resolve();
        }
    }

    @PluginMethod
    public void consumeShare(PluginCall call) {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        JSObject ret = new JSObject();
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) {
            ret.put("shared", false);
            call.resolve(ret);
            return;
        }

        String mime = intent.getType() == null ? "" : intent.getType();
        CharSequence rawText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        CharSequence rawSubject = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
        String text = rawText == null ? "" : rawText.toString();
        String subject = rawSubject == null ? "" : rawSubject.toString();

        ret.put("shared", !text.trim().isEmpty() || !subject.trim().isEmpty());
        ret.put("text", text);
        ret.put("title", subject);
        ret.put("mime", mime);

        intent.setAction(null);
        intent.removeExtra(Intent.EXTRA_TEXT);
        intent.removeExtra(Intent.EXTRA_SUBJECT);
        getActivity().setIntent(intent);
        call.resolve(ret);
    }

    @PluginMethod
    public void openOAuth(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://") || !url.contains("/auth/v1/authorize")) {
            call.reject("oauth_url_not_allowed", "OAUTH_URL_NOT_ALLOWED");
            return;
        }
        try {
            Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            browser.addCategory(Intent.CATEGORY_BROWSABLE);
            getActivity().startActivity(browser);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("browser_unavailable", "BROWSER_UNAVAILABLE", e);
        }
    }

    @PluginMethod
    public void consumeAuthCallback(PluginCall call) {
        Intent intent = getActivity().getIntent();
        JSObject output = new JSObject();
        Uri uri = intent == null ? null : intent.getData();
        if (uri == null || !Intent.ACTION_VIEW.equals(intent.getAction())
            || !"bayonafit".equals(uri.getScheme()) || !"auth".equals(uri.getHost())
            || !"/callback".equals(uri.getPath())) {
            output.put("url", "");
            call.resolve(output);
            return;
        }
        // Tras entregarlo una vez, el enlace ya no permanece en el intent
        // ni se registra en logcat. Nunca imprimir los tokens.
        output.put("url", uri.toString());
        intent.setData(null);
        intent.setAction(null);
        getActivity().setIntent(intent);
        call.resolve(output);
    }

    @PluginMethod
    public void appSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void createCalendarEvent(PluginCall call) {
        String title = call.getString("title", "BAYONA");
        Long beginMs = call.getLong("beginMs");
        Long endMs = call.getLong("endMs");
        String location = call.getString("location", "");
        String notes = call.getString("notes", "");
        boolean allDay = Boolean.TRUE.equals(call.getBoolean("allDay", false));
        if (beginMs == null) {
            call.reject("begin_required", "BEGIN_REQUIRED");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, title)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, beginMs)
            .putExtra(CalendarContract.Events.EVENT_LOCATION, location)
            .putExtra(CalendarContract.Events.DESCRIPTION, notes)
            .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, allDay);
        if (endMs != null && endMs > beginMs) {
            intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endMs);
        }
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("calendar_app_unavailable", "CALENDAR_APP_UNAVAILABLE", e);
        }
    }
}
