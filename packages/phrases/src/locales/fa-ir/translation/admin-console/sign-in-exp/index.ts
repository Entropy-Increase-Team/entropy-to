import content from './content.js';
import custom_profile_fields from './custom-profile-fields.js';
import sign_up_and_sign_in from './sign-up-and-sign-in.js';

const sign_in_exp = {
  page_title: 'تجربه ورود',
  page_title_with_account: 'ورود و حساب کاربری',
  title: 'ورود و حساب کاربری',
  description:
    'جریان‌های احراز هویت و رابط کاربری را سفارشی کنید و تجربه آماده را به صورت بلادرنگ پیش‌نمایش دهید.',
  tabs: {
    branding: 'برندینگ',
    sign_up_and_sign_in: 'ثبت‌نام و ورود',
    collect_user_profile: 'جمع‌آوری پروفایل کاربر',
    account_center: 'مرکز حساب',
    content: 'محتوا',
    password_policy: 'سیاست رمز عبور',
  },
  welcome: {
    title: 'سفارشی‌سازی تجربه ورود',
    description:
      'با اولین تنظیمات ورود خود سریع شروع کنید. این راهنما شما را از طریق تمام تنظیمات لازم هدایت می‌کند.',
    get_started: 'شروع کنید',
    apply_remind:
      'لطفاً توجه داشته باشید که تجربه ورود برای تمام برنامه‌های این حساب اعمال خواهد شد.',
  },
  color: {
    title: 'رنگ',
    primary_color: 'رنگ برند',
    dark_primary_color: 'رنگ برند (تاریک)',
    dark_mode: 'فعال‌سازی حالت تاریک',
    dark_mode_description:
      'برنامه شما یک تم حالت تاریک به صورت خودکار بر اساس رنگ برند و الگوریتم Logto خواهد داشت. می‌توانید آن را سفارشی کنید.',
    dark_mode_reset_tip: 'محاسبه مجدد رنگ حالت تاریک بر اساس رنگ برند.',
    reset: 'محاسبه مجدد',
    link_color: 'رنگ پیوند و فوکوس',
    dark_link_color: 'رنگ پیوند و فوکوس (تاریک)',
  },
  branding: {
    title: 'ناحیه برندینگ',
    ui_style: 'سبک',
    with_light: '{{value}}',
    with_dark: '{{value}} (تاریک)',
    app_logo_and_favicon: 'لوگو برنامه و فاویکون',
    company_logo_and_favicon: 'لوگو شرکت و فاویکون',
    organization_logo_and_favicon: 'لوگو سازمان و فاویکون',
    hide_logto_branding: 'پنهان کردن برندینگ Logto',
    hide_logto_branding_description:
      'عبارت "Powered by Logto" را حذف کنید. برند خود را با یک تجربه ورود تمیز و حرفه‌ای برجسته کنید.',
    hide_logto_branding_oss_note:
      'این ویژگی در <a>Logto Cloud</a> یا <selfHosted>طرح‌های self-hosted</selfHosted> در دسترس است.',
    brand_name: 'نام برند',
    brand_name_placeholder: 'مثلاً مرکز حساب Entropy',
    tagline: 'زیرعنوان',
    tagline_placeholder: 'توضیح کوتاه نمایش‌داده‌شده زیر عنوان',
    adaptive_logo: 'لوگوی سازگار با حالت تاریک',
    adaptive_logo_description:
      'در صورت نبود لوگوی تاریک جداگانه، لوگوی روشن تک‌رنگ را در حالت تاریک به‌طور خودکار معکوس می‌کند.',
    footer_branding: 'امضای پاورقی',
    footer_branding_hidden: 'پنهان',
    footer_branding_custom: 'برند سفارشی',
    footer_branding_logto: 'نشان Logto',
    footer_text: 'متن پاورقی',
    footer_text_placeholder: 'قدرت‌گرفته از برند شما',
    footer_link_url: 'نشانی پیوند پاورقی',
    footer_logo_url: 'نشانی لوگوی پاورقی (روشن)',
    footer_dark_logo_url: 'نشانی لوگوی پاورقی (تاریک)',
    footer_icp_record: 'شناسه ICP / قانونی',
    footer_icp_record_placeholder: 'مثلاً ICP-00000000',
    footer_icp_url: 'نشانی پیوند قانونی',
  },
  appearance: {
    title: 'طراحی صفحه',
    preset: 'پیش‌تنظیم پوسته',
    preset_entropy: 'Entropy',
    preset_entropy_description:
      'سطوح لایه‌ای خنثی، دکمه اصلی تک‌رنگ، حلقه فوکوس آبی آرام و شبکه فنی ظریف.',
    preset_classic: 'کلاسیک',
    preset_classic_description: 'چیدمان کارت میانی سنتی با رنگ‌های تأکیدی برند.',
    preset_minimal: 'مینیمال',
    preset_minimal_description: 'بوم تخت بدون قاب با تایپوگرافی فشرده.',
    layout: 'چیدمان صفحه',
    layout_centered: 'کارت در مرکز',
    layout_framed: 'کارت قاب‌دار',
    layout_split_left: 'دوتایی (معرفی چپ)',
    layout_split_right: 'دوتایی (معرفی راست)',
    layout_minimal: 'مینیمال بدون قاب',
    header_alignment: 'چینش سرصفحه',
    align_center: 'وسط',
    align_left: 'چپ',
    card_width: 'عرض کارت',
    width_compact: 'فشرده',
    width_default: 'پیش‌فرض',
    width_wide: 'عریض',
    top_bar: 'نوار ناوبری بالا',
    top_bar_enabled: 'نمایش نوار بالای ثابت و نیمه‌شفاف',
    top_bar_theme_toggle: 'نمایش دکمه تغییر پوسته روشن/تاریک',
    top_bar_home_url: 'نشانی صفحه اصلی',
    top_bar_home_label: 'برچسب پیوند خانه',
    top_bar_home_label_placeholder: 'بازگشت به خانه',
    background: 'سبک پس‌زمینه',
    bg_solid: 'تک‌رنگ',
    bg_tech_grid: 'شبکه فنی',
    bg_subtle_gradient: 'گرادیان ملایم',
    bg_image: 'تصویر',
    bg_light_color: 'رنگ بوم (روشن)',
    bg_dark_color: 'رنگ بوم (تاریک)',
    bg_image_url: 'نشانی تصویر پس‌زمینه (روشن)',
    bg_dark_image_url: 'نشانی تصویر پس‌زمینه (تاریک)',
    hero_section: 'محتوای بخش معرفی دوتایی',
    hero_badge: 'نشان معرفی',
    hero_badge_placeholder: 'هویت یکپارچه',
    hero_title: 'عنوان معرفی',
    hero_title_placeholder: 'به‌طور پیش‌فرض نام برند',
    hero_description: 'توضیحات معرفی',
    hero_description_placeholder: 'محصول یا فضای کاری خود را معرفی کنید',
    hero_image_url: 'نشانی تصویر معرفی (روشن)',
    hero_dark_image_url: 'نشانی تصویر معرفی (تاریک)',
    surface_section: 'کارت و تایپوگرافی',
    light_card_color: 'رنگ سطح کارت (روشن)',
    dark_card_color: 'رنگ سطح کارت (تاریک)',
    card_radius: 'گردی گوشه کارت',
    control_radius: 'گردی گوشه کنترل‌ها',
    radius_none: 'هیچ',
    radius_sm: 'کوچک',
    radius_md: 'متوسط',
    radius_lg: 'بزرگ',
    radius_xl: 'خیلی بزرگ',
    radius_pill: 'کپسولی',
    shadow: 'سایه کارت',
    shadow_none: 'تخت',
    shadow_whisper: 'ملایم',
    shadow_elevated: 'برجسته',
    dark_top_highlight: 'خط درخشان 1px بالا در حالت تاریک',
    font_preset: 'خانواده فونت',
    font_noto_sans_sc: 'Noto Sans SC + JetBrains Mono',
    font_inter: 'Inter + JetBrains Mono',
    font_system: 'پیش‌فرض سیستم',
    font_custom: 'فونت وب سفارشی',
    custom_font_family: 'font-family سفارشی',
    custom_font_stylesheet_url: 'نشانی شیوه‏نامه فونت (https://)',
    motion_error_shake: 'لرزش ظریف هنگام خطای اعتبارسنجی',
    motion_reduced: 'کاهش انیمیشن‌های غیرضروری',
    override_section: 'بازنویسی طراحی صفحه',
    inherit_tenant: 'ارث‌بری پیش‌فرض مستأجر',
  },
  branding_uploads: {
    app_logo: {
      title: 'لوگو برنامه',
      url: 'آدرس لوگو برنامه',
      url_placeholder: 'https://your.cdn.domain/logo.png',
      error: 'لوگو برنامه: {{error}}',
    },
    company_logo: {
      title: 'لوگو شرکت',
      url: 'آدرس لوگو شرکت',
      url_placeholder: 'https://your.cdn.domain/logo.png',
      error: 'لوگو شرکت: {{error}}',
    },
    organization_logo: {
      title: 'آپلود تصویر',
      url: 'آدرس لوگو سازمان',
      url_placeholder: 'https://your.cdn.domain/logo.png',
      error: 'لوگو سازمان: {{error}}',
    },
    connector_logo: {
      title: 'آپلود تصویر',
      url: 'آدرس لوگو اتصال‌دهنده',
      url_placeholder: 'https://your.cdn.domain/logo.png',
      error: 'لوگو اتصال‌دهنده: {{error}}',
    },
    favicon: {
      title: 'فاویکون',
      url: 'آدرس فاویکون',
      url_placeholder: 'https://your.cdn.domain/favicon.ico',
      error: 'فاویکون: {{error}}',
    },
  },
  custom_ui: {
    title: 'رابط کاربری سفارشی',
    cloud_tag: 'ابری',
    css_code_editor_title: 'CSS سفارشی',
    css_code_editor_field_title: 'بازنویسی CSS',
    css_code_editor_description1: 'نمونه CSS سفارشی را ببینید.',
    css_code_editor_description2: '<a>{{link}}</a>',
    css_code_editor_description_link_content: 'بیشتر بدانید',
    css_code_editor_content_placeholder:
      'بازنویسی‌های CSS خود را اینجا وارد کنید تا سبک‌ها را دقیقاً مطابق مشخصات خود تنظیم کنید. خلاقیت خود را نشان دهید و رابط کاربری خود را برجسته کنید.',
    bring_your_ui_title: 'رابط کاربری خود را بیاورید',
    bring_your_ui_upload_title: 'آپلود دارایی‌های رابط کاربری سفارشی',
    bring_your_ui_description:
      'یک بسته فشرده (.zip) آپلود کنید تا رابط کاربری از پیش‌ساخته Logto را با کد خود جایگزین کنید. <a>بیشتر بدانید</a>',
    bring_your_ui_oss_description: 'رابط کاربری ورود را با کد خود سفارشی کنید.',
    bring_your_ui_oss_card_description:
      'آپلود رابط کاربری سفارشی در <a>Logto Cloud</a> یا <selfHosted>طرح‌های self-hosted</selfHosted> در دسترس است. نیازی به fork و استقرار مجدد نیست.',
    bring_your_ui_oss_try_cloud: 'امتحان Cloud',
    preview_with_bring_your_ui_description:
      'دارایی‌های رابط کاربری سفارشی شما با موفقیت آپلود شده و در حال ارائه هستند. در نتیجه، پنجره پیش‌نمایش داخلی غیرفعال شده است.\nبرای آزمایش رابط کاربری ورود شخصی‌سازی‌شده خود، روی دکمه "پیش‌نمایش زنده" کلیک کنید تا در یک تب جدید مرورگر باز شود.',
    csp_description:
      'عبارات منبع اضافی برای رابط کاربری ورود سفارشی خود مجاز کنید. این مقادیر فقط زمانی اعمال می‌شوند که دارایی‌های رابط کاربری سفارشی ارائه می‌شوند.',
    csp_script_src: 'script-src مجاز',
    csp_script_src_tip:
      'عبارات منبع HTTPS برای اسکریپت‌های بارگذاری‌شده توسط رابط کاربری سفارشی را مجاز کنید، مانند https://scripts.example.com یا https://*.example.com.',
    csp_connect_src: 'connect-src مجاز',
    csp_connect_src_tip:
      'عبارات منبع HTTPS یا WSS برای درخواست‌های شبکه‌ای رابط کاربری سفارشی را مجاز کنید، مانند https://api.example.com یا wss://events.example.com.',
    csp_source_invalid_error:
      'یک عبارت منبع معتبر وارد کنید. از آدرس‌های https:// استفاده کنید؛ connect-src همچنین از wss:// پشتیبانی می‌کند. کلمات کلیدی CSP و نقطه‌ویرگول پشتیبانی نمی‌شوند.',
    csp_source_duplicate_error: 'این عبارت منبع قبلاً در لیست است.',
    coop_tip:
      'رابط کاربری ورود سفارشی خود را از پنجره‌های با مبدأ متفاوت جدا کنید. فقط زمانی اعمال می‌شود که دارایی‌های رابط کاربری سفارشی ارائه می‌شوند.',
    coop_unsafe_none: 'تنظیم نشده (بدون هدر)',
    coop_warning:
      'برنامه‌هایی که صفحه ورود را در یک پنجره بازشو باز می‌کنند و به window.opener وابسته‌اند، دیگر کار نخواهند کرد. پنجره‌های بازشویی که رابط کاربری سفارشی باز می‌کند نیز هنگام بازگشت به رابط کاربری سفارشی، مثلاً در صفحه بازگشت ورود اجتماعی، window.opener را از دست می‌دهند. با same-origin، آن را بلافاصله پس از باز شدن از دست می‌دهند.',
  },
  account_center: {
    recent_authentication: {
      title: 'احراز هویت اخیر',
      description:
        'عملیات حساس حساب، مانند تغییر گذرواژه یا غیرفعال کردن تأیید دو مرحله‌ای، نیازمند ورود اخیر است، چه در Account Center و چه در برنامه‌ای که Account API را فراخوانی می‌کند. این بازه مشخص می‌کند که ورود باید چقدر اخیر باشد.',
      maximum_authentication_age_in_minutes: 'حداکثر عمر احراز هویت بر حسب دقیقه',
      maximum_authentication_age_in_minutes_tip:
        'مدت زمانی که یک ورود برای عملیات حساس به‌اندازه کافی جدید باقی می‌ماند. کلاینت همچنان می‌تواند با پارامتر `max_age` بازه کوتاه‌تری درخواست کند.',
    },
    title: 'مرکز حساب',
    description:
      'مرکز حساب کاربری خود را برای مدیریت امنیت حساب و اطلاعات پروفایل توسط کاربران نهایی پیاده‌سازی کنید.',
    enable_account_api: 'فعال‌سازی مرکز حساب و Account API',
    enable_account_api_description:
      'هم Account API کاربرمحور و هم مرکز حساب آماده Logto را فعال کنید. در صورت خاموش بودن، هر دو ویژگی در دسترس نیستند.',
    field_options: {
      off: 'خاموش',
      edit: 'ویرایش',
      read_only: 'فقط خواندنی',
      enabled: 'فعال',
      disabled: 'غیرفعال',
    },
    sections: {
      account_security: {
        title: 'امنیت حساب',
        description:
          'دسترسی به Account API را مدیریت کنید و به کاربران امکان مشاهده یا ویرایش اطلاعات هویتی و عوامل احراز هویت پس از ورود به برنامه را بدهید.',
        security_verification: {
          title: 'تأیید امنیتی',
          description:
            'قبل از تغییر تنظیمات امنیتی، کاربران باید هویت خود را تأیید کنند تا یک شناسه رکورد تأیید ۱۰ دقیقه‌ای دریافت کنند. برای فعال‌سازی روش تأیید (ایمیل، تلفن، رمز عبور)، مجوز Account API را به <strong>فقط خواندنی</strong> (حداقل) یا <strong>ویرایش</strong> در زیر تنظیم کنید تا سیستم بتواند تشخیص دهد آیا کاربر آن را پیکربندی کرده است. <a>بیشتر بدانید</a>',
          description_step_up:
            'قبل از تغییر تنظیمات امنیتی، Account Center داخلی نیازمند یک ورود اخیر است. اگر ورود فعلی قدیمی‌تر از بازه احراز هویت اخیر تنظیم‌شده باشد، Account Center یک OIDC step-up را آغاز می‌کند و از کاربر می‌خواهد هویت خود را تأیید کند. برای اینکه کاربران بتوانند یک روش تأیید (ایمیل، تلفن یا گذرواژه) را در Account Center مشاهده یا مدیریت کنند، مجوز Account API مربوطه را در زیر روی <strong>فقط خواندنی</strong> یا <strong>ویرایش</strong> تنظیم کنید. برای این عملیات حساس، برنامه‌هایی که مستقیماً Account API را فراخوانی می‌کنند همچنان می‌توانند از یک شناسه رکورد تأیید استفاده کنند. <a>بیشتر بدانید</a>',
        },
        groups: {
          identifiers: {
            title: 'شناسه‌ها',
          },
          authentication_factors: {
            title: 'عوامل احراز هویت',
          },
          session_management: {
            title: 'مدیریت نشست',
          },
          developer_settings: {
            title: 'تنظیمات توسعه‌دهنده',
          },
        },
      },
      user_profile: {
        title: 'پروفایل کاربر',
        description:
          'دسترسی به Account API را مدیریت کنید و به کاربران امکان مشاهده یا ویرایش داده‌های پروفایل پایه یا سفارشی پس از ورود به برنامه را بدهید.',
        groups: {
          profile_data: {
            title: 'داده‌های پروفایل',
          },
        },
      },
      secret_vault: {
        title: 'خزانه راز',
        description:
          'برای اتصال‌دهنده‌های اجتماعی و سازمانی، توکن‌های دسترسی شخص ثالث را برای فراخوانی API‌های آن‌ها به صورت امن ذخیره کنید (مثلاً افزودن رویدادها به Google Calendar).',
        third_party_token_storage: {
          title: 'توکن شخص ثالث',
          third_party_access_token_retrieval: 'بازیابی توکن دسترسی شخص ثالث',
          third_party_token_tooltip:
            'برای ذخیره توکن‌ها، می‌توانید این را در تنظیمات اتصال‌دهنده اجتماعی یا سازمانی مربوطه فعال کنید.',
          third_party_token_description:
            'پس از فعال‌سازی Account API، بازیابی توکن شخص ثالث به طور خودکار فعال می‌شود.',
        },
      },
    },
    fields: {
      email: 'آدرس ایمیل',
      phone: 'شماره تلفن',
      social: 'هویت‌های اجتماعی',
      password: 'رمز عبور',
      mfa: 'احراز هویت چندعاملی',
      passkey: 'کلید عبور',
      username: 'نام کاربری',
      name: 'نام',
      avatar: 'آواتار',
      profile: 'پروفایل',
      profile_description: 'کنترل دسترسی به ویژگی‌های پروفایل ساختاریافته.',
      custom_data: 'داده‌های سفارشی',
      custom_data_description: 'کنترل دسترسی به داده‌های JSON سفارشی ذخیره‌شده روی کاربر.',
      sessions: 'نشست‌ها',
      trusted_devices: 'دستگاه‌های مورد اعتماد',
      personal_access_tokens: 'توکن‌های دسترسی شخصی',
      personal_access_tokens_description:
        'فعال کردن این گزینه به کاربران امکان می‌دهد توکن‌های دسترسی شخصی بلندمدتی ایجاد کنند که پس از خروج از حساب و بازنشانی رمز عبور همچنان فعال می‌مانند و هر برنامه طرف اولی که تبادل توکن در آن فعال باشد می‌تواند آن‌ها را با توکن دسترسی مبادله کند.',
    },
    profile_fields: {
      title: 'فیلدهای پروفایل برای مرکز حساب از پیش‌ساخته',
      add_profile_fields: 'افزودن فیلدهای پروفایل',
      hint: {
        not_in_list: 'در لیست نیست؟',
        set_up: 'تنظیم کنید',
        go_to: 'سایر فیلدهای پروفایل را اکنون.',
      },
      disabled_hint: {
        name: "برای افزودن این فیلد، ابتدا مجوز 'نام' را در بخش پروفایل کاربر زیر به 'ویرایش / فقط خواندنی' تنظیم کنید.",
        avatar:
          "برای افزودن این فیلد، ابتدا مجوز 'آواتار' را در بخش پروفایل کاربر زیر به 'ویرایش / فقط خواندنی' تنظیم کنید.",
        profile:
          "برای افزودن این فیلد، ابتدا مجوز 'پروفایل' را در بخش پروفایل کاربر زیر به 'ویرایش / فقط خواندنی' تنظیم کنید.",
        custom_data:
          "برای افزودن این فیلد، ابتدا مجوز 'داده‌های سفارشی' را در بخش پروفایل کاربر زیر به 'ویرایش / فقط خواندنی' تنظیم کنید.",
      },
    },
    webauthn_related_origins: 'مبدأهای مرتبط WebAuthn',
    webauthn_related_origins_description:
      'دامنه‌های برنامه‌های فرانت‌اند خود را که مجاز به ثبت کلیدهای عبور از طریق Account API هستند اضافه کنید.',
    webauthn_related_origins_error: 'مبدأ باید با https:// یا http:// شروع شود',
    delete_account_url: 'حذف حساب',
    delete_account_url_description:
      'آدرس endpoint خود را برای مدیریت حذف حساب با منطق سفارشی ارائه دهید.',
    prebuilt_ui: {
      title: 'یکپارچه‌سازی رابط کاربری از پیش‌ساخته',
      description:
        'مرکز حساب آماده، تأیید امنیتی یا یک جریان به‌روزرسانی پروفایل تکی را با رابط کاربری از پیش‌ساخته به سرعت یکپارچه کنید. کافی است دامنه خود را با مسیر ترکیب کنید تا آدرس مرکز حساب خود را بسازید (مثلاً https://auth.foo.com/account/email).',
      permission_notice:
        'برای یکپارچه‌سازی این جریان‌های از پیش‌ساخته، مجوزهای مرتبط Account API را در تنظیمات زیر به <strong>ویرایش</strong> تنظیم کنید.',
      account_center_title: 'یکپارچه‌سازی مرکز حساب آماده',
      account_center_description:
        'کاربران را به مرکز حساب هدایت کنید تا تنظیمات امنیتی مانند ایمیل، تلفن، نام کاربری، رمز عبور، MFA و حساب‌های متصل را مدیریت کنند.',
      flows_title: 'یکپارچه‌سازی جریان‌های تنظیمات امنیتی آماده',
      single_task_flows_title: 'یکپارچه‌سازی یک جریان تکلیف تکی آماده',
      flows_description:
        'دامنه خود را با مسیر ترکیب کنید تا آدرس تنظیمات حساب خود را بسازید (مثلاً https://auth.foo.com/account/email). به صورت اختیاری `redirect=` را برای بازگشت کاربران به برنامه پس از به‌روزرسانی موفق، `show_success=true` برای نگه داشتن صفحه موفقیت، `ui_locales=` برای بازنویسی زبان پیش‌فرض، `login_hint=` برای پیش‌پر کردن شناسه در صفحه ورود، یا `identifier=` برای پیش‌پر کردن مقدار جدید در مسیر ایمیل، تلفن یا نام کاربری اضافه کنید.',
      single_task_flows_description:
        'کاربران را مستقیماً به یک جریان خاص هدایت کنید (مثلاً اتصال ایمیل). به صورت اختیاری `redirect=` را برای بازگشت کاربران به برنامه پس از به‌روزرسانی موفق، `show_success=true` برای نگه داشتن صفحه موفقیت، `ui_locales=` برای بازنویسی زبان پیش‌فرض، `login_hint=` برای پیش‌پر کردن شناسه در صفحه ورود، یا `identifier=` برای پیش‌پر کردن مقدار جدید در مسیر ایمیل، تلفن یا نام کاربری اضافه کنید.',
      tooltips: {
        email: 'آدرس ایمیل اصلی خود را به‌روزرسانی کنید',
        phone: 'شماره تلفن اصلی خود را به‌روزرسانی کنید',
        username: 'نام کاربری خود را به‌روزرسانی کنید',
        password: 'یک رمز عبور جدید تنظیم کنید',
        social: 'یک حساب اجتماعی برای ورود متصل کنید',
        social_change: 'به حساب اجتماعی متصل دیگری تغییر دهید',
        social_remove: 'یک حساب اجتماعی متصل را حذف کنید',
        authenticator_app: 'یک برنامه احراز هویت جدید برای احراز هویت چندعاملی تنظیم کنید',
        authenticator_app_replace: 'برنامه احراز هویت موجود خود را با یک برنامه جدید جایگزین کنید',
        passkey_add: 'یک کلید عبور جدید ثبت کنید',
        passkey_manage: 'کلیدهای عبور موجود خود را مدیریت کنید یا موارد جدید اضافه کنید',
        backup_codes_generate: 'یک مجموعه جدید از ۱۰ کد پشتیبان تولید کنید',
        backup_codes_manage: 'کدهای پشتیبان موجود خود را مشاهده کنید یا موارد جدید تولید کنید',
        account_center:
          'به مرکز حساب دسترسی پیدا کنید تا تنظیمات امنیتی مانند ایمیل، تلفن، نام کاربری، رمز عبور، MFA و حساب‌های متصل را مدیریت کنید',
        profile: 'مرکز اصلی برای مدیریت اطلاعات شخصی شما (مثلاً نام، آواتار)',
        sessions: 'نشست‌های فعال خود را در دستگاه‌های مختلف مشاهده و مدیریت کنید',
      },
      customize_note: 'تجربه آماده را نمی‌خواهید؟ می‌توانید کاملاً',
      customize_link: 'جریان‌های خود را با Account API سفارشی کنید.',
    },
    custom_css: {
      title: 'CSS سفارشی',
      description: 'ظاهر مرکز حساب را با استفاده از CSS سفارشی شخصی‌سازی کنید.',
    },
  },
  sign_up_and_sign_in,
  content,
  setup_warning: {
    no_connector_sms:
      'هنوز هیچ اتصال‌دهنده SMS تنظیم نشده است. قبل از تکمیل پیکربندی، کاربران قادر به ورود با این روش نخواهند بود. <a>{{link}}</a> در "اتصال‌دهنده‌ها"',
    no_connector_email:
      'هنوز هیچ اتصال‌دهنده ایمیل تنظیم نشده است. قبل از تکمیل پیکربندی، کاربران قادر به ورود با این روش نخواهند بود. <a>{{link}}</a> در "اتصال‌دهنده‌ها"',
    no_connector_social:
      'هنوز هیچ اتصال‌دهنده اجتماعی تنظیم نکرده‌اید. ابتدا اتصال‌دهنده‌ها را اضافه کنید تا روش‌های ورود اجتماعی را اعمال کنید. <a>{{link}}</a> در "اتصال‌دهنده‌ها".',
    no_connector_email_account_center:
      'هنوز هیچ اتصال‌دهنده ایمیل تنظیم نشده است. در <a>"اتصال‌دهنده‌های ایمیل و SMS"</a> تنظیم کنید.',
    no_connector_sms_account_center:
      'هنوز هیچ اتصال‌دهنده SMS تنظیم نشده است. در <a>"اتصال‌دهنده‌های ایمیل و SMS"</a> تنظیم کنید.',
    no_connector_social_account_center:
      'هنوز هیچ اتصال‌دهنده اجتماعی تنظیم نشده است. در <a>"اتصال‌دهنده‌های اجتماعی"</a> تنظیم کنید.',
    no_mfa_factor: 'هنوز هیچ عامل MFA تنظیم نشده است. در <a>{{link}}</a> تنظیم کنید.',
    setup_link: 'تنظیم کنید',
  },
  save_alert: {
    description:
      'شما در حال پیاده‌سازی روش‌های جدید ورود و ثبت‌نام هستید. همه کاربران شما ممکن است تحت تأثیر تنظیمات جدید قرار گیرند. آیا مطمئن هستید که می‌خواهید این تغییر را اعمال کنید؟',
    before: 'قبل',
    after: 'بعد',
    sign_up: 'ثبت‌نام',
    sign_in: 'ورود',
    social: 'اجتماعی',
    forgot_password_migration_notice:
      'تأیید فراموشی رمز عبور را برای پشتیبانی از روش‌های سفارشی ارتقا داده‌ایم. قبلاً این به طور خودکار توسط اتصال‌دهنده‌های ایمیل و SMS شما تعیین می‌شد. برای تکمیل ارتقا روی <strong>تأیید</strong> کلیک کنید.',
  },
  preview: {
    title: 'پیش‌نمایش ورود',
    live_preview: 'پیش‌نمایش زنده',
    live_preview_tip: 'برای پیش‌نمایش تغییرات ذخیره کنید',
    native: 'بومی',
    desktop_web: 'وب دسکتاپ',
    mobile_web: 'وب موبایل',
    desktop: 'دسکتاپ',
    mobile: 'موبایل',
    sign_in_page: 'ورود',
    register_page: 'ثبت‌نام',
  },
  custom_profile_fields,
};

export default Object.freeze(sign_in_exp);
