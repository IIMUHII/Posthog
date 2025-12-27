# PostHog PoC Dashboard 🚀

لوحة تحكم تفاعلية لاختبار PostHog مع CapRover.

## المميزات

- ✅ واجهة عصرية باللغة العربية
- ✅ 9 خدمات API مختلفة للاختبار
- ✅ تتبع كامل للأحداث مع PostHog
- ✅ إحصائيات مباشرة للطلبات
- ✅ محاكاة الأخطاء والطلبات البطيئة
- ✅ جاهز للنشر على CapRover

## الخدمات المتاحة

| الخدمة | المسار | الوصف |
|--------|--------|-------|
| Health Check | `GET /health` | فحص حالة الخادم |
| Stats | `GET /api/stats` | إحصائيات الخادم |
| Orders | `GET /api/orders` | قائمة الطلبات |
| Users | `GET /api/users` | قائمة المستخدمين |
| Products | `GET /api/products` | قائمة المنتجات |
| Slow Request | `GET /api/slow` | محاكاة طلب بطيء |
| Error | `GET /api/error` | محاكاة أخطاء |
| Register | `POST /api/register` | تسجيل مستخدم |
| Batch Events | `POST /api/batch-events` | أحداث متعددة |

## النشر على CapRover

### 1. المتغيرات البيئية المطلوبة

```env
POSTHOG_PROJECT_KEY=phc_xxxxxxxxxxxxx
POSTHOG_HOST=https://app.posthog.com
PORT=5050
```

### 2. النشر

```bash
# باستخدام CapRover CLI
caprover deploy
```

أو ارفع الملفات كـ tar:

```bash
tar -cvf deploy.tar .
# ثم ارفع الملف في CapRover Dashboard
```

## التشغيل المحلي

```bash
# تثبيت المتطلبات
npm install

# تعيين المتغيرات البيئية
export POSTHOG_PROJECT_KEY=phc_xxxxxxxxxxxxx
export POSTHOG_HOST=https://app.posthog.com

# التشغيل
npm start
```

افتح المتصفح على: http://localhost:5050

## الأحداث المرسلة لـ PostHog

- `health_check` - فحص الحالة
- `stats_viewed` - عرض الإحصائيات
- `orders_viewed` - عرض الطلبات
- `users_listed` - عرض المستخدمين
- `products_viewed` - عرض المنتجات
- `slow_request_completed` - اكتمال طلب بطيء
- `api_error_triggered` - حدوث خطأ
- `user_registered` - تسجيل مستخدم
- `purchase_completed` - إتمام شراء
- `feature_flag_checked` - فحص feature flag
- `batch_event` - أحداث متعددة
- `server_error` - أخطاء الخادم

## البنية

```
posthog-poc/
├── captain-definition    # إعدادات CapRover
├── Dockerfile           # Docker build
├── package.json         # التبعيات
├── index.js            # نقطة الدخول
├── routes.js           # مسارات API
├── posthog.js          # إعدادات PostHog
└── public/
    └── index.html      # لوحة التحكم
```

---

تم بناؤه للاختبار مع PostHog 📊
