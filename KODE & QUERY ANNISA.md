# **KODE & QUERY ANNISA**

# ***Dokumentasi Query SQL & Data Analytics***

---

# **1.Query Permintaan Dataset**

## **▼ [Dataset Audit input CPPT RPA RPB](#▼-dataset-audit-input-cppt-rpa-rpb)** {#▼-dataset-audit-input-cppt-rpa-rpb}

WITH laporan\_akhir AS (  
    SELECT  
        id\_kunjungan,  
        MAX(inserted\_date::TIMESTAMP) FILTER (  
            WHERE role \= 'Dokter'  
              AND asesmen\_detail \-\> 'tindak\_lanjut' \-\>\> 'tindak\_lanjut'::text \= 'Diperbolehkan Pulang'  
        ) AS waktu\_akhir\_dokter,  
        MAX(inserted\_date::TIMESTAMP) FILTER (  
            WHERE role \= 'Apoteker'  
        ) AS waktu\_akhir\_apoteker  
    FROM emr\_rawat\_inap.cppt   
    GROUP BY id\_kunjungan  
)  
SELECT  
    DISTINCT ri."ID REGISTRASI RANAP",  
    ri."NAMA PASIEN",  
    ri."NAMA RUANG",  
    ri."NO RM",  
    ri."TGL LAHIR",  
    ri."JENIS KELAMIN",  
    ri."SPESIALIS RAWAT INAP",  
    ri."DIAGNOSA UTAMA",  
    ri."PROSEDUR UTAMA",  
\-- (ri."WAKTU IRNA AKHIR"::date \- ri."WAKTU IRNA AWAL"::date) AS los\_hari  
CASE   
        WHEN to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  IS NULL   
        OR to\_timestamp("WAKTU IRNA AKHIR", 'YYYY-MM-DD HH24:MI:SS')  IS NULL THEN NULL   
        WHEN DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') ) \= DATE\_TRUNC('day', to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') ) THEN '1'::NUMERIC  
        WHEN FLOOR(EXTRACT(EPOCH FROM COALESCE(to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') , now()) \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )/86400) \= 0 THEN '1'::NUMERIC  
        ELSE EXTRACT(DAY FROM DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  \+ INTERVAL '1 DAY') \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )::NUMERIC  
    END AS "LOS",  
    ri."Cara keluar",  
    TO\_CHAR(la.waktu\_akhir\_dokter, 'YYYY-MM-DD HH24:MI:SS')   AS "WAKTU CPPT DOKTER TERAKHIR",  
    TO\_CHAR(la.waktu\_akhir\_apoteker, 'YYYY-MM-DD HH24:MI:SS') AS "WAKTU CPPT APOTEKER TERAKHIR",  
    ri."WAKTU PULANG"  
FROM emr\_view.mv\_rawat\_inap ri  
JOIN  laporan\_akhir la ON la.id\_kunjungan \=  ri."ID REGISTRASI RANAP"  
WHERE "NAMA RUANG" in (  
    '(RPA) PERAWATAN ANAK',  
    '(RPB) PERAWATAN BEDAH'  
    ) AND   
    "TGL REGISTRASI RANAP"::TIMESTAMP BETWEEN '2026-09-13' AND '2026-10-07'   
      AND la.waktu\_akhir\_dokter IS NOT NULL  
      AND (  
            la.waktu\_akhir\_apoteker IS NULL                      \-- apoteker tidak pernah input  
            OR la.waktu\_akhir\_apoteker \< la.waktu\_akhir\_dokter  \-- apoteker input hanya sebelum dokter  
      );  
---

## **▶ Jumlah Kunjungan Rawat Inap 2025 dan 2026**

SELECT  
    DISTINCT ri."ID REGISTRASI RANAP",  
    ri."NAMA PASIEN",  
    ri."NO RM",  
    ri."TGL REGISTRASI RANAP" AS "TANGGAL MASUK",

CASE   
        WHEN to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  IS NULL   
        OR to\_timestamp("WAKTU IRNA AKHIR", 'YYYY-MM-DD HH24:MI:SS')  IS NULL THEN NULL   
        WHEN DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') ) \= DATE\_TRUNC('day', to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') ) THEN '1'::NUMERIC  
        WHEN FLOOR(EXTRACT(EPOCH FROM COALESCE(to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') , now()) \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )/86400) \= 0 THEN '1'::NUMERIC  
        ELSE EXTRACT(DAY FROM DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  \+ INTERVAL '1 DAY') \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )::NUMERIC  
    END AS "LOS",  
    ri."DIAGNOSA UTAMA",  
    ri."DPJP RAWAT INAP",  
    ri."Cara keluar" AS "STATUS PULANG",

    ri."WAKTU PULANG"  
FROM emr\_view.mv\_rawat\_inap ri

WHERE  
    ri."TGL REGISTRASI RANAP"::TIMESTAMP \>= '2025-01-01'::TIMESTAMP   
    AND ri."TGL REGISTRASI RANAP"::TIMESTAMP \< '2026-10-01'::TIMESTAMP   
ORDER BY  
    ri."TGL REGISTRASI RANAP";  
---

## **▼ Pasien dr. Melfa Rajal 2025-2026**

SELECT   
rj."ID REGISTRASI",  
rj."TANGGAL REGISTRASI",  
rj."NO RM",  
rj."NAMA",  
rj."TANGGAL LAHIR",  
rj."JENIS KELAMIN",  
rj."ASURANSI",  
rj."DIAGNOSA UTAMA",  
rj."DIAGNOSA SEKUNDER",  
rj."PROSEDUR UTAMA",  
rj."PROSEDUR SEKUNDER",  
RJ."DOKTER",  
rj."SPESIALIS"

FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj 

WHERE rj."DOKTER" \= 'dr. Melfa Lamria Berliana L, Sp.S' AND   
      rj."TANGGAL REGISTRASI"::TIMESTAMP  \>= '2025-01-01'  
      AND rj."TANGGAL REGISTRASI"::TIMESTAMP  \<= '2026-12-31'  
      AND EXTRACT(ISODOW FROM rj."TANGGAL REGISTRASI"::TIMESTAMP ) \= 5;  
;  
---

## **▶ Pasien Epilepsi 2026 RAJAL**

SELECT   
rj."ID REGISTRASI",  
rj."TANGGAL REGISTRASI",  
rj."NO RM",  
rj."NAMA",  
rj."TANGGAL LAHIR",  
rj."JENIS KELAMIN",  
rj."ASURANSI",  
rj."DIAGNOSA UTAMA",  
rj."DIAGNOSA SEKUNDER",  
  CASE   
    WHEN rj."DIAGNOSA UTAMA" ilike 'G40.0%'   
      OR rj."DIAGNOSA UTAMA" ilike 'G40.1%'  
      OR rj."DIAGNOSA UTAMA" ilike 'G40.2%'  
      THEN 'EPILEPSI PARSIAL'  
    ELSE   
    'EPILEPSI PARSIAL RESISTEN OBAT'  
    END AS "KATEGORI EPILEPSI",  
rj."PROSEDUR UTAMA",  
rj."PROSEDUR SEKUNDER",  
RJ."DOKTER",  
rj."SPESIALIS"

FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj   
WHERE   
  (rj."DIAGNOSA UTAMA" ilike 'G40.0%'  
    OR  rj."DIAGNOSA UTAMA" ilike 'G40.1%'  
    OR  rj."DIAGNOSA UTAMA" ilike 'G40.2%'  
    OR  rj."DIAGNOSA UTAMA" ilike 'G40.5%')  
  \-- WHERE rj."DIAGNOSA UTAMA" \~\* '^G40\\.\[0125\]'  
  AND rj."TANGGAL REGISTRASI"::TIMESTAMP  \>= '2026-01-01'  
    
  \-- WHERE rj."DIAGNOSA UTAMA" \~\* '^G40\\.\[0125\]'  
    \-- AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01'  
    
ORDER BY rj."TANGGAL REGISTRASI"::TIMESTAMP ASC   
;  
---

## **▼ Riset 126**

| WITH lab\_pertama AS (     \-- Mengambil waktu request Lab paling pertama per Id Registrasi     SELECT          mdl."Id Registrasi"::TEXT AS id\_reg,         MIN(mdl.tanggal\_request::TIMESTAMP) AS waktu\_lab\_awal     FROM emr\_view.mv\_dashboard\_lab mdl     WHERE mdl.tanggal\_request IS NOT NULL     GROUP BY mdl."Id Registrasi"::TEXT ), rad\_pertama AS (     \-- Mengambil waktu request Radiologi paling pertama per ID Kun     SELECT          mddr."ID Kun"::TEXT AS id\_reg,         MIN(mddr.tanggal\_request::TIMESTAMP) AS waktu\_rad\_awal     FROM emr\_view.mv\_dashboard\_daftar\_radiologi mddr     WHERE mddr.tanggal\_request IS NOT NULL     GROUP BY mddr."ID Kun"::TEXT ) SELECT     mdi."No RM",     mdi."Id Registrasi",     mdi."Nama Pasien",     mdi."Tanggal Lahir",     \-- 2\. Kategori Umur (\< 18 Anak, \>= 18 Dewasa)     mdi."Umur",     CASE          WHEN NULLIF(REGEXP\_REPLACE(mdi."Umur"::TEXT, '\[^0-9\]', '', 'g'), '')::INT \< 18 THEN 'Anak'         WHEN NULLIF(REGEXP\_REPLACE(mdi."Umur"::TEXT, '\[^0-9\]', '', 'g'), '')::INT \>= 18 THEN 'Dewasa'         ELSE NULL     END AS "Kategori Umur",     \-- 3\. Kesimpulan Emergensi      mdi."Kesimpulan Emergensi" AS "Kategori Triage",     \-- 4\. Kategori SHIFT dari Waktu Triage     \-- mdi."Waktu Triage",     (t.inserted\_date \+ INTERVAL '7 hours')::TIMESTAMP AS "Waktu Triage",     CASE         WHEN (t.inserted\_date \+ INTERVAL '7 hours')::TIME \>= TIME '07:00:00'          AND (t.inserted\_date \+ INTERVAL '7 hours')::TIME \<  TIME '14:00:00'             THEN 'Pagi'         WHEN (t.inserted\_date \+ INTERVAL '7 hours')::TIME \>= TIME '14:00:00'          AND (t.inserted\_date \+ INTERVAL '7 hours')::TIME \<  TIME '21:00:00'             THEN 'Siang'         WHEN (t.inserted\_date \+ INTERVAL '7 hours')::TIME \>= TIME '21:00:00'           OR (t.inserted\_date \+ INTERVAL '7 hours')::TIME \<  TIME '07:00:00'             THEN 'Malam'         ELSE NULL     END AS "SHIFT (Waktu Triage)",     \-- 5\. Kolom-kolom Timestamp & Status Outcome     mdi."Waktu Registrasi Awal",     mdi."Waktu Igd Medis Awal" AS "Waktu Pemeriksaan Dokter Pertama",           \-- Mengambil waktu paling awal antara Lab dan Radiologi (otomatis mengabaikan jika salah satu NULL)     LEAST(lp.waktu\_lab\_awal, rp.waktu\_rad\_awal) AS "Waktu Instruksi Penunjang Pertama",          \-- Menampilkan waktu masing-masing jika peneliti ingin mengecek sumbernya (bisa dihapus jika tidak perlu)     lp.waktu\_lab\_awal AS "Waktu Lab Pertama",     rp.waktu\_rad\_awal AS "Waktu Radiologi Pertama",          mdi."Waktu Igd Medis Akhir" AS "Waktu Keputusan Akhir",     mdi."Tindak Lanjut Akhir Igd" AS "Status Outcome",     mdi."Tanggal Pulang" AS "Timestamp Keluar Igd",     \-- 6\. Perhitungan LOS (Length of Stay)     ROUND(     (EXTRACT(EPOCH FROM (mdi."Tanggal Pulang"::TIMESTAMP \- (t.inserted\_date::TIMESTAMP \+ INTERVAL '7 hours'))) / 86400.0)::NUMERIC,      2     ) AS "LOS (Satuan Hari)"      FROM emr\_view.mv\_dashboard\_igd mdi LEFT JOIN  emr\_igd.asesmen\_triage t on mdi."Id Triage" \= t.id\_triage LEFT JOIN lab\_pertama lp ON mdi."Id Registrasi"::TEXT \= lp.id\_reg LEFT JOIN rad\_pertama rp ON mdi."Id Registrasi"::TEXT \= rp.id\_reg WHERE (t.inserted\_date::TIMESTAMP \+ INTERVAL '7 hours')::TIMESTAMP \>= TIMESTAMP '2026-07-01 00:00:00'   AND (t.inserted\_date::TIMESTAMP \+ INTERVAL '7 hours')::TIMESTAMP \<  TIMESTAMP '2026-10-01 00:00:00' ORDER BY  mdi."Waktu Registrasi Awal" ASC ; |
| :---- |

---

## **▶ \-**

|  |
| :---- |

---

# **2\. Query Superset**

## **▼ Kepatuhan RJ**

SELECT   
    rj.\*,  
    rj."TANGGAL REGISTRASI"::TIMESTAMP AS "TGL REGIS",  
    ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id AS "ID PRAKTEK",  
    sd."WAKTU ASLI",  
    sd."WAKTU REVISI",  
    sd."WAKTU SELESAI ASLI",  
    sd."WAKTU SELESAI REVISI",  
    CASE  
        \-- Datang lebih awal \> 60 menit sebelum jadwal asli dokter  
        WHEN (DATE\_PART('epoch', sd."WAKTU ASLI" \- rj."TANGGAL REGISTRASI"::TIMESTAMP) / 60\) \> 60   
            THEN 'Tidak Sesuai'  
        \-- Datang \<= 60 menit sebelum jadwal asli ATAU sesudah jadwal asli  
        ELSE 'Sesuai'  
    END AS "KATEGORI"  
FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj   
LEFT JOIN (  
    SELECT  
        a.schedule\_doctor\_id,  
        a.registration\_id,  
        (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",  
        (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",  
        (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",  
        (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"  
    FROM public.antrianlists a  
    LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif  
    LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id  
) sd ON sd.registration\_id \= rj."ID REGISTRASI"  
WHERE sd."WAKTU ASLI" IS NOT NULL   
  AND sd."WAKTU REVISI" IS NOT NULL  
  AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01';  
---

## **▶ Kepatuhan RJ \+ 6 Kategori**

## **▼ PO dan Penerimaan Barang Farmasi**

\--query pembelian/pembelanjaan obat  
SELECT   
po.\*,  
p.id as "ID PENERIMAAN",  
case when p.is\_po is true then 'PO' else 'TIDAK PO' end as "STATUS PO",  
p.date::timestamp as "TANGGAL PENERIMAAN",  
(p.kedatangan\_tgl::date \- po."TGL PO"::date) AS "SELISIH HARI",  
    CASE  
        \-- WHEN po.status\_transaksi \= 1   
        \-- belom diterima  
        \-- WHEN  po."STATUS PURCHASE ORDER" \= 'Proses' THEN 'BELOM' \-\> ada yang udah ada 4 hari dan udah ada tanggal kedatangan  
        WHEN p.kedatangan\_tgl::TIMESTAMP  \< po."TGL PO"::TIMESTAMP \+ INTERVAL '2 weeks'  
        THEN 'DITERIMA \< 2 MINGGU'  
        \-- sudah diterima , \< 2minggu \> 2 minggu ( penerimaan),   
        ELSE 'DITERIMA \> 2 MINGGU'  
    END AS "STATUS PENERIMAAN 2 MINGGU",  
    CASE  
    WHEN po."ID PO ITEMS (PO)" IS NULL  
        THEN 'TANPA PO'  
    WHEN i."STATUS DITERIMA" \= 'TIDAK DITERIMA' AND i."QTY PENERIMAAN" \= 0  
        THEN 'BARANG TIDAK DITERIMA (KOSONG)'  
    WHEN i."STATUS DITERIMA" \= 'TIDAK DITERIMA'  
        THEN 'BARANG TIDAK DITERIMA'  
    WHEN i."QTY PENERIMAAN" \<\> i."PO QTY"  
        THEN 'DITERIMA TAPI JUMLAH TIDAK SAMA'  
    ELSE 'DITERIMA LENGKAP'  
END AS "STATUS PENERIMAAN ITEM",

g.nama as "NAMA GUDANG",  
wms."name" as "NAMA SUPPLIER",   
p.faktur\_no as "NOMOR FAKTUR",   
p.faktur\_tgl as "TANGGAL FAKTUR",  
p.jatuhtempo\_tgl::timestamp as "TANGGAL JATUH TEMPO",  
p.kedatangan\_tgl::timestamp as "TANGGAL KEDATANGAN",  
p.tagih\_tgl::timestamp as "TANGGAL TAGIH",  
CASE  
    WHEN p.status \= 2 THEN 'Proses'  
    WHEN p.status \= 3 THEN 'Tutup'  
    WHEN p.status \= 0 THEN 'Draft'  
    ELSE 'Kunci'  
END AS "STATUS PENERIMAAN",

\-- p.bayar,  
\-- p.sisa,  
\-- p.gudang\_id,  
\-- i.barang\_id,  
i.\*  
from public.wf\_pembelians p  
left join emr\_master.master\_gudang g on p.gudang\_id \= g.id\_gudang  
left join public.wm\_ms\_suppliers wms on wms.id \= p.supplier\_id   
left join (select  
pi.pembelian\_id,  
pi.poitem\_id as "ID PO ITEMS",  
pi.barang\_id,  
b.id as "ID BARANG",  
b.name as "NAMA BARANG",  
wms."name" as "SATUAN",  
pi.qty as "QTY PENERIMAAN",  
pi.qjb as "QJB",  
pi.po\_qty as "PO QTY",  
pi.total\_qty as "TOTAL QTY",  
pi.tax as "PAJAK",  
pi.disc as "DISKON",  
pi.nilai\_disc as "TOTAL DISKON",  
pi.nilai\_tax as "TOTAL PAJAK",  
pi.harga\_satuan as "HARGA BELI",  
(pi.harga\_satuan::NUMERIC \- pi.nilai\_disc::NUMERIC) \+ pi.nilai\_tax::NUMERIC AS "TOTAL HARGA",  
b.hargapokok as "HARGA POKOK",   
pi.nobatch as "NOMOR BATCH",  
pi.exired\_date as "TANGGAL EXPIRED",  
case when pi.is\_tidak\_datang is false then 'DITERIMA' else 'TIDAK DITERIMA' end as "STATUS DITERIMA",  
case when pi.is\_validasi is false then 'TIDAK TERVALIDASI' else 'TERVALIDASI' end as "STATUS VALIDASI"  
from public.wf\_pembelian\_items pi   
left join public.wf\_ms\_barangs b on pi.barang\_id \= b.id  
left join public.wf\_tarif\_cbgs t on b.tarifcbg\_id \= t.id  
left join public.wm\_ms\_satuans wms on wms.id \= pi.satuan\_id  
where pi."deletedAt" is null) i on p.id \= i.pembelian\_id  
left join (--PO ITEMS PURCHASE ORDER FARMASI  
select   
wp.id as "ID PO",  
wp."nomorPO" as "NOMOR PESANAN",  
wp.tanggal\_rencana\_datang as "TANGGAL RENCANA DATANG",  
wp."date" as "TGL PO",  
\--2 \= Penerimaan,   
g.nama as "NAMA GUDANG",  
wms."name" as "SUPPLIER",  
poi."ID PO ITEMS (PO)",  
\-- wpi.id as "ID PO ITEMS (PO)",  
CASE  
    WHEN wp.status\_transaksi \= 2 THEN 'Penerimaan'  
    WHEN wp.status\_transaksi \= 3 THEN 'Tutup'  
    WHEN wp.status\_transaksi \= 1 THEN 'Proses'  
    ELSE 'Draft'  
END AS "STATUS PURCHASE ORDER"  
\-- CASE  
\--     WHEN wp.status\_transaksi \= 1  
\--         AND CURRENT\_DATE \> wp."date"::date \+ 14  
\--         AND NOT EXISTS (  
\--             SELECT 1  
\--             FROM public.wf\_pembelians p\_check  
\--             WHERE p\_check.po\_id \= wp.id  
\--               AND p\_check."deletedAt" IS NULL  
\--         )  
\--     THEN 'BELUM PENERIMAAN \> 2 MINGGU'  
\--     ELSE 'AMAN'  
\-- END AS "TIDAK ADA PENERIMAAN 2 MINGGU"

\--poi."JUMLAH DIPESAN"  
from public.wf\_purchaseorders wp   
left join emr\_master.master\_gudang g on g.id\_gudang \= wp.gudang\_id   
left join public.wm\_ms\_suppliers wms on wms.id \= wp.supplier\_id   
left join (select   
wpi.po\_id,  
wpi.id as "ID PO ITEMS (PO)",  
wmb.id as "ID BARANG",  
wmb."name" as "BARANG",  
wpi.qty as "JUMLAH DIPESAN",  
wms."name" as "SATUAN",  
wpi.qjb as "QJB",  
wpi.harga as "HARGA",  
wpi.disc as "DISKON",  
wpi.pajak as "PAJAK",  
\-- Harga setelah diskon  
wpi.harga::NUMERIC \- ROUND(((wpi.disc/100) \* wpi.harga)::NUMERIC, 2\) \+ ROUND(((wpi.pajak/100) \* (wpi.harga::NUMERIC \- ROUND(((wpi.disc/100) \* wpi.harga)::NUMERIC, 2)))::NUMERIC, 2\) AS "TOTAL HARGA",  
wpi.harga\_pokok as "HARGA POKOK"  
from public.wf\_po\_items wpi   
left join public.wf\_ms\_barangs wmb on wmb.id \= wpi.barang\_id   
left join public.wm\_ms\_satuans wms on wms.id \= wpi.satuan\_id   
\-- where wpi.po\_id \= 12354  
and wpi."deletedAt" is null) poi on poi.po\_id \= wp.id   
where wp."deletedAt" is null) po on po."ID PO ITEMS (PO)" \= i."ID PO ITEMS"   
where   
\--p.kedatangan\_tgl::timestamp::timestamp \>= '2026-05-01' and p.date::timestamp \< '2026-06-01'   
\--and   
p."deletedAt" is null  
and p.versi \= '3.0'  
\--and p.is\_po \= true  
\--and i."PO QTY" \<\> i."QTY BELI"   
\--and p.id \= 47604   
\-- and lower(i.kategori\_barang) LIKE '%obat%'  
\-- order by p.date, p.id

---

## **▶ [Kepatuhan Rj \+ Kat real](#▶-kepatuhan-rj-+-kat-real)** {#▶-kepatuhan-rj-+-kat-real}

SELECT   
    sub.\*,  
      
    \-- KATEGORI 2: Level Sesi Praktik (ID PRAKTEK)  
    \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'  
    CASE   
        WHEN COUNT(CASE WHEN sub.kategori\_pasien \= 'Tidak Sesuai' THEN 1 END) OVER (  
            PARTITION BY sub."ID PRAKTEK"  
        ) \> 0 THEN 'Tidak Sesuai'  
        ELSE 'Sesuai'  
    END AS "KATEGORI\_SESI",

    \-- KATEGORI 3: Level Bulanan Dokter  
    \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan, seluruh baris dokter di bulan itu jadi 'Tidak Sesuai'  
    CASE   
        WHEN COUNT(CASE WHEN sub."KATEGORI" \= 'Tidak Sesuai' THEN 1 END) OVER (  
            PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")  
        ) \> 0 THEN 'Tidak Sesuai'  
        ELSE 'Sesuai'  
    END AS "KATEGORI\_BULANAN",  
      
    \-- KATEGORI 4 \= Tidak ada Toleransi Beda Jadwal  
    CASE   
        WHEN sub."WAKTU ASLI" \= sub."WAKTU REVISI"  
             AND sub."WAKTU SELESAI ASLI" \= sub."WAKTU SELESAI REVISI"  
        THEN 'Sesuai'  
        ELSE 'Tidak Sesuai'  
    END AS "KATEGORI\_4",  
      
      \-- KATEGORI 5: Level Sesi Praktik (ID PRAKTEK)  
    \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'  
    CASE   
        WHEN COUNT(CASE WHEN sub.kategori\_pasien5 \= 'Tidak Sesuai' THEN 1 END) OVER (  
            PARTITION BY sub."ID PRAKTEK"  
        ) \> 0 THEN 'Tidak Sesuai'  
        ELSE 'Sesuai'  
    END AS "KATEGORI\_5",  
      
    \-- KATEGORI 6: Level Bulanan Dokter2  
    \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan (Kategori 4), seluruh baris dokter di bulan itu jadi 'Tidak Sesuai'  
\-- KATEGORI 6: Level Bulanan Dokter berdasarkan KATEGORI 4  
    CASE   
        WHEN COUNT(  
            CASE   
                WHEN sub."WAKTU ASLI" \<\> sub."WAKTU REVISI"  
                  OR sub."WAKTU SELESAI ASLI" \<\> sub."WAKTU SELESAI REVISI"  
                THEN 1  
            END  
        ) OVER (  
            PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")  
        ) \> 0   
        THEN 'Tidak Sesuai'  
        ELSE 'Sesuai'  
    END AS "KATEGORI\_6",  
      
    \-- KATEGORI 7 : toleransi 30 menit sebelum task id 4  
    sub.kategori\_task4 AS "KATEGORI REAL"

FROM (  
    SELECT   
        rj.\*,  
        rj."TANGGAL REGISTRASI"::TIMESTAMP AS "TGL REGIS",  
        ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id AS "ID PRAKTEK",  
        sd.schedule\_doctor\_id,  
        sd."WAKTU ASLI",  
        sd."WAKTU REVISI",  
        sd."WAKTU SELESAI ASLI",  
        sd."WAKTU SELESAI REVISI",  
        \-- Evaluasi internal pasien (hanya dipakai window function di atas)  
        CASE  
            WHEN rj."TANGGAL REGISTRASI"::TIMESTAMP  
                 BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'  
                     AND sd."WAKTU SELESAI ASLI"  
            THEN 'Sesuai'  
            ELSE 'Tidak Sesuai'  
        END AS kategori\_pasien,  
        CASE  
            WHEN ak."TANGGAL INPUT ASKEP"::TIMESTAMP  
                 BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'  
                     AND sd."WAKTU SELESAI ASLI"  
            THEN 'Sesuai'  
            ELSE 'Tidak Sesuai'  
        END AS kategori\_pasien5,  
          
        \-- t4."TASK 4",  
        t4."TASK 1",  
        t4."TASK 2",  
        t4."TASK 3",  
        t4."TASK 4",  
        MIN(t4."TASK 4") OVER (  
            PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id  
        ) AS "TASK 4 PERTAMA",  
        \-- Level sesi: pasien pertama task\_id\_4 maks 30 menit sebelum jadwal asli  
        CASE  
            WHEN MIN(t4."TASK 4") OVER (  
                    PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id  
                 )  
                 BETWEEN sd."WAKTU ASLI" \- INTERVAL '30 minutes'  
                     AND sd."WAKTU ASLI" \+ INTERVAL '30 minutes'  
            THEN 'Sesuai'  
            ELSE 'Tidak Sesuai'  
        END AS kategori\_task4,

        CASE  
            WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60  
                 AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Sesuai'  
            WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60  
                 AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'  
            WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60  
                 AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'  
            WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60  
                 AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Tidak Sesuai'  
            WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NULL THEN 'Sesuai'  
            WHEN sd."WAKTU ASLI" IS NOT NULL AND sd."WAKTU REVISI" IS NULL THEN 'Tidak Sesuai'  
        END AS "KATEGORI"

    FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj   
    LEFT JOIN (  
        SELECT  
            a.schedule\_doctor\_id,  
            a.registration\_id,  
            (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",  
            (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",  
            (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",  
            (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"  
        FROM public.antrianlists a  
        LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif  
        LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id  
    ) sd ON sd.registration\_id \= rj."ID REGISTRASI"  
    LEFT JOIN (  
        select   
            ak.id\_kunjungan,  
            ak.inserted\_date \+ interval '7 hours' as "TANGGAL INPUT ASKEP"  
        from emr\_rawat\_jalan.asesmen\_keperawatan ak   
        where ak.deleted\_date is null  
        ) ak on ak.id\_kunjungan \= rj."ID REGISTRASI"  
    LEFT JOIN (  
        SELECT  
            jkn.id\_registrations,  
            MAX(CASE WHEN jkn.task\_id \= 1 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 1",  
            MAX(CASE WHEN jkn.task\_id \= 2 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 2",  
            MAX(CASE WHEN jkn.task\_id \= 3 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 3",  
            MAX(CASE WHEN jkn.task\_id \= 4 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 4"  
        FROM public.antrianjkn jkn  
        WHERE jkn.task\_id IN (1, 2, 3, 4\)  
          AND jkn.terkirim IS TRUE  
        GROUP BY jkn.id\_registrations  
    ) t4 ON t4.id\_registrations \= rj."ID REGISTRASI"  
    WHERE sd."WAKTU ASLI" IS NOT NULL   
      AND sd."WAKTU REVISI" IS NOT NULL  
      AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01'  
      AND rj."SPESIALIS" NOT IN (  
      'AKUPUNKTUR',  
      'ANESTESI',  
      'FISIOTERAPI',  
      'GIGI Umum',  
      'GIZI KLINIK',  
      'KEDOKTERAN OKUPASI',  
      'LAKTASI',  
      'MCU',  
      'MEMORI',  
      'OKUPASI TERAPIS',  
      'PSIKOLOGI KLINIS',  
      'RADIOLOGI',  
      'TERAPI NYERI',  
      'TERAPI PERILAKU',  
      'TERAPI WICARA'  
    )  
        
) sub

---

## **▼ [Kepatuhan Rj \+ Kat Jam Mulai](#▼-kepatuhan-rj-+-kat-jam-mulai)** {#▼-kepatuhan-rj-+-kat-jam-mulai}

| SELECT      sub.\*,          \-- KATEGORI 2: Level Sesi Praktik (ID PRAKTEK)     \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub.kategori\_pasien \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."ID PRAKTEK"         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_SESI",     \-- KATEGORI 3: Level Bulanan Dokter     \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan, seluruh baris dokter di bulan itu jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub."KATEGORI" \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_BULANAN",          \-- KATEGORI 4 \= Tidak ada Toleransi Beda Jadwal     CASE          WHEN sub."WAKTU ASLI" \= sub."WAKTU REVISI"              AND sub."WAKTU SELESAI ASLI" \= sub."WAKTU SELESAI REVISI"         THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "KATEGORI\_4",            \-- KATEGORI 5: Level Sesi Praktik (ID PRAKTEK)     \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub.kategori\_pasien5 \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."ID PRAKTEK"         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_5",          \-- KATEGORI 6: Level Bulanan Dokter2     \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan (Kategori 4), seluruh baris dokter di bulan itu jadi 'Tidak Sesuai' \-- KATEGORI 6: Level Bulanan Dokter berdasarkan KATEGORI 4     CASE          WHEN COUNT(             CASE                  WHEN sub."WAKTU ASLI" \<\> sub."WAKTU REVISI"                   OR sub."WAKTU SELESAI ASLI" \<\> sub."WAKTU SELESAI REVISI"                 THEN 1             END         ) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")         ) \> 0          THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_6",          \-- KATEGORI 7 : toleransi 30 menit sebelum task id 4     sub.kategori\_task4 AS "KATEGORI REAL",        \-- CASE    \--       WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '30 minutes')    \--         AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')   \--       THEN 'Sesuai'            \--       WHEN sub."TASK 4 PERTAMA" BETWEEN (sub."WAKTU ASLI" \- INTERVAL '60 minutes')   \--                                     AND (sub."WAKTU ASLI" \- INTERVAL '30 minutes')   \--       THEN 'Mulai Lebih Awal 30 Menit \- 1 Jam'            \--       \-- Urutan dibalik: \+30 menit dulu (batas bawah), baru \+60 menit (batas atas)   \--       WHEN sub."TASK 4 PERTAMA" BETWEEN (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')   \--                                     AND (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')   \--       THEN 'Mulai Lebih Akhir 30 Menit \- 1 Jam'            \--       WHEN sub."TASK 4 PERTAMA" \< (sub."WAKTU ASLI" \- INTERVAL '1 hour')   \--       THEN 'Mulai Lebih Awal \> 1 Jam'            \--       WHEN sub."TASK 4 PERTAMA" \> (sub."WAKTU ASLI" \+ INTERVAL '1 hour')   \--       THEN 'Mulai Lebih Akhir \> 1 Jam'            \--       ELSE 'Tidak Sesuai'   \--   END AS "KATEGORI JAM MULAI"       CASE              \-- 1\. Toleransi \+- 30 Menit (Misal Jadwal 09:00 \-\> 08:30:00 s/d 09:30:00)             WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '30 minutes')               AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')             THEN 'Sesuai'                          \-- 2\. Lebih Awal 30 Menit \- 1 Jam (Misal Jadwal 09:00 \-\> 08:00:00 s/d 08:29:59)             WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '60 minutes')              AND sub."TASK 4 PERTAMA" \<  (sub."WAKTU ASLI" \- INTERVAL '30 minutes')             THEN 'Mulai Lebih Awal 30 Menit \- 1 Jam'                          \-- 3\. Lebih Akhir 30 Menit \- 1 Jam (Misal Jadwal 09:00 \-\> 09:30:01 s/d 10:00:00)             WHEN sub."TASK 4 PERTAMA" \>  (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')              AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir 30 Menit \- 1 Jam'                          \-- 4\. Lebih Awal \> 1 Jam (Misal Jadwal 09:00 \-\> di bawah 08:00:00)             WHEN sub."TASK 4 PERTAMA" \< (sub."WAKTU ASLI" \- INTERVAL '60 minutes')             THEN 'Mulai Lebih Awal \> 1 Jam'                          \-- 5\. Lebih Akhir \> 1 Jam (Misal Jadwal 09:00 \-\> di atas 10:00:00)             WHEN sub."TASK 4 PERTAMA" \> (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir \> 1 Jam'                          ELSE 'Lainnya'         END AS "KATEGORI JAM MULAI" FROM (     SELECT          rj.\*,         rj."TANGGAL REGISTRASI"::TIMESTAMP AS "TGL REGIS",         ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id AS "ID PRAKTEK",         sd.schedule\_doctor\_id,         sd."WAKTU ASLI",         sd."WAKTU REVISI",         sd."WAKTU SELESAI ASLI",         sd."WAKTU SELESAI REVISI",         \-- Evaluasi internal pasien (hanya dipakai window function di atas)         CASE             WHEN rj."TANGGAL REGISTRASI"::TIMESTAMP                  BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'                      AND sd."WAKTU SELESAI ASLI"             THEN 'Sesuai'             ELSE 'Tidak Sesuai'         END AS kategori\_pasien,         CASE             WHEN ak."TANGGAL INPUT ASKEP"::TIMESTAMP                  BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'                      AND sd."WAKTU SELESAI ASLI"             THEN 'Sesuai'             ELSE 'Tidak Sesuai'         END AS kategori\_pasien5,                  \-- t4."TASK 4",         t4."TASK 1",         t4."TASK 2",         t4."TASK 3",         t4."TASK 4",         MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id         ) AS "TASK 4 PERTAMA",         \-- Level sesi: pasien pertama task\_id\_4 maks 30 menit sebelum jadwal asli         CASE             WHEN MIN(t4."TASK 4") OVER (                     PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id                  )                  BETWEEN sd."WAKTU ASLI" \- INTERVAL '30 minutes'                      AND sd."WAKTU ASLI" \+ INTERVAL '30 minutes'             THEN 'Sesuai'             ELSE 'Tidak Sesuai'         END AS kategori\_task4,         CASE             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NULL THEN 'Sesuai'             WHEN sd."WAKTU ASLI" IS NOT NULL AND sd."WAKTU REVISI" IS NULL THEN 'Tidak Sesuai'         END AS "KATEGORI"     FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj      LEFT JOIN (         SELECT             a.schedule\_doctor\_id,             a.registration\_id,             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"         FROM public.antrianlists a         LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif         LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id     ) sd ON sd.registration\_id \= rj."ID REGISTRASI"     LEFT JOIN (         select              ak.id\_kunjungan,             ak.inserted\_date \+ interval '7 hours' as "TANGGAL INPUT ASKEP"         from emr\_rawat\_jalan.asesmen\_keperawatan ak          where ak.deleted\_date is null         ) ak on ak.id\_kunjungan \= rj."ID REGISTRASI"     LEFT JOIN (         SELECT             jkn.id\_registrations,             MAX(CASE WHEN jkn.task\_id \= 1 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 1",             MAX(CASE WHEN jkn.task\_id \= 2 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 2",             MAX(CASE WHEN jkn.task\_id \= 3 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 3",             MAX(CASE WHEN jkn.task\_id \= 4 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 4"         FROM public.antrianjkn jkn         WHERE jkn.task\_id IN (1, 2, 3, 4\)           AND jkn.terkirim IS TRUE         GROUP BY jkn.id\_registrations     ) t4 ON t4.id\_registrations \= rj."ID REGISTRASI"     WHERE sd."WAKTU ASLI" IS NOT NULL        AND sd."WAKTU REVISI" IS NOT NULL       AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01'       AND rj."SPESIALIS" NOT IN (       'AKUPUNKTUR',       'ANESTESI',       'FISIOTERAPI',       'GIGI Umum',       'GIZI KLINIK',       'KEDOKTERAN OKUPASI',       'LAKTASI',       'MCU',       'MEMORI',       'OKUPASI TERAPIS',       'PSIKOLOGI KLINIS',       'RADIOLOGI',       'TERAPI NYERI',       'TERAPI PERILAKU',       'TERAPI WICARA'     )        ) sub  |
| :---- |

---

## **▶ [Monitoring Hak Kelas Bed BPJS RANAP](#▶-monitoring-hak-kelas-bed-bpjs-ranap)** {#▶-monitoring-hak-kelas-bed-bpjs-ranap}

| WITH ri AS (     SELECT         ri.\*,         b.nama\_kelas AS "NAMA KELAS",         \-- normalisasi: "KELAS I" / "KELAS 1" \-\> '1'         CASE upper(trim(regexp\_replace(ri."HAK KELAS BPJS", '^\\s\*KELAS\\s\*', '', 'i')))             WHEN 'I' THEN '1' WHEN 'II' THEN '2' WHEN 'III' THEN '3'             ELSE upper(trim(regexp\_replace(ri."HAK KELAS BPJS", '^\\s\*KELAS\\s\*', '', 'i')))         END AS hak\_kelas\_norm,         CASE upper(trim(regexp\_replace(b.nama\_kelas, '^\\s\*KELAS\\s\*', '', 'i')))             WHEN 'I' THEN '1' WHEN 'II' THEN '2' WHEN 'III' THEN '3'             ELSE upper(trim(regexp\_replace(b.nama\_kelas, '^\\s\*KELAS\\s\*', '', 'i')))         END AS kelas\_bed\_norm,         CASE             WHEN DATE\_PART('day', ri."WAKTU PULANG"::timestamp \- ri."TGL REGISTRASI RANAP"::timestamp) \= 0 THEN 1             ELSE DATE\_PART('day', ri."WAKTU PULANG"::timestamp \- ri."TGL REGISTRASI RANAP"::timestamp) \+ 1         END AS "LOS"     FROM emr\_view.mv\_rawat\_inap ri 	left join (SELECT mb\_1.id, 	                    mb\_1.name AS nama\_bed, 	                    mb\_1.kelas\_id, 	                    mb\_1.kamar\_id, 	                    mkk.nama\_kelas  	                   FROM ms\_beds mb\_1 	             LEFT JOIN ( SELECT mk\_1.id, 	                    mk\_1.name AS nama\_kelas, 	                    mk\_1.remark 	                   FROM ms\_kelaskamars mk\_1 	                  WHERE mk\_1."deletedAt" IS NULL) mkk ON mkk.id \= mb\_1.kelas\_id) b on b.nama\_bed \= ri."NAMA BED"     WHERE ri."TGL REGISTRASI RANAP"::timestamp \>= '2026-01-01'     and "NAMA ASURANSI" \= 'BPJS'     \--  AND ri.waktu\_dihapus IS NULL ), sesuai AS (     SELECT         "ID REGISTRASI RANAP",         COALESCE(             bool\_or(                 kelas\_bed\_norm \= hak\_kelas\_norm                 AND date\_start::timestamp \<= "TGL REGISTRASI RANAP"::timestamp \+ interval '72 hours'             ), false         ) AS pernah\_sesuai,         string\_agg(DISTINCT "NAMA KELAS", ', ') AS riwayat\_kelas     FROM ri     GROUP BY "ID REGISTRASI RANAP" ), last\_bed AS (     SELECT DISTINCT ON ("ID REGISTRASI RANAP") \*     FROM ri     ORDER BY "ID REGISTRASI RANAP", date\_start DESC NULLS LAST ) SELECT     lb."ID REGISTRASI RANAP",     lb."ID REGISTRASI ASAL",     lb."TGL REGISTRASI RANAP"::timestamp AS "TGL REGISTRASI RANAP",     lb."NO RM",     lb."NAMA PASIEN",     lb."TGL LAHIR",     lb."UMUR",     lb."JENIS KELAMIN",     lb."DPJP RAWAT INAP",     lb."SPESIALIS RAWAT INAP",     lb."NAMA ASURANSI",     lb."HAK KELAS BPJS",     lb."NAMA RUANG",     lb."NAMA KAMAR",     lb."NAMA BED"   AS "BED TERAKHIR",     lb."NAMA KELAS" AS "KELAS BED TERAKHIR",     s.riwayat\_kelas AS "RIWAYAT KELAS BED",     CASE         WHEN lb."NAMA ASURANSI" \<\> 'BPJS' THEN 'Non BPJS'         WHEN s.pernah\_sesuai THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI",     case  	    when "WAKTU PULANG" is null then 'Belum Pulang'     	when kelas\_bed\_norm \= hak\_kelas\_norm then 'Sesuai'     	else 'Tidak Sesuai'     end as "STATUS BED SESUAI (PULANG)",     case 	    when "WAKTU PULANG" is null then 'Belum Pulang'         WHEN lb."NAMA ASURANSI" \<\> 'BPJS' THEN 'Non BPJS'         WHEN s.pernah\_sesuai and kelas\_bed\_norm \= hak\_kelas\_norm THEN 'Sesuai' \--        and kelas\_bed\_norm \= hak\_kelas\_norm then 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI KESELURUHAN",     lb."DIAGNOSA UTAMA",     lb."DIAGNOSA SEKUNDER",     lb."PROSEDUR UTAMA",     lb."PROSEDUR SEKUNDER",     lb."WAKTU PULANG"::timestamp AS "WAKTU PULANG",     lb."Cara keluar",     lb."LOS" FROM last\_bed lb JOIN sesuai s ON s."ID REGISTRASI RANAP" \= lb."ID REGISTRASI RANAP"  |
| :---- |

---

## **▼ Boxplot Waktu**

| Dataset IGD Terbaru dan Pelayanan Rawat Inap |
| :---- |

---

## **▶ Forecast Penjualan Obat Farmasi**

| \-- \============================================================ \-- PARETO ABC (VARIAN SUPPLIER DIGABUNG) \+ DATA HARIAN UNTUK FORECASTING \-- Periode: 1 Maret 2026 s/d 30 September 2026 \-- \============================================================ with a as ( select distinct on (mvp."ID TRANSAKSI", mvp."QTY", mvp."HARGA POKOK")  \*, trim(regexp\_replace(upper(mvp."BARANG"), '\\s\*${[}^{(})]*$\\s\*\$', '')) as "BARANG GABUNGAN" \-- nama tanpa suffix supplier from emr\_view.mv\_validasi\_penjualan mvp  LEFT JOIN public.transaksi\_detail\_barangs p ON p.id \= mvp."ID TRANSAKSI" left join (     select id, is\_active     from public.wf\_ms\_barangs wmb      where wmb."deletedAt" is null       and wmb.hargapokok is not null \-- Abaikan jika harga pokok di master NULL ) b on b.id \= mvp."ID BARANG" where mvp.tarif\_cbg \= 'obat' and mvp."TGL JUAL"::timestamp \>= '2026-03-01' and mvp."TGL JUAL"::timestamp \<  '2026-10-01' AND mvp."ID KUNJUNGAN" IS NOT NULL and p."deletedAt" IS null and is\_active is true and mvp."HARGA POKOK" is not null \-- Abaikan jika harga pokok di transaksi NULL ), gbb as (  select      count(distinct date\_trunc('month', "TGL JUAL"::TIMESTAMP)) as "JUMLAH BULAN",     count(distinct date\_trunc('day', "TGL JUAL"::TIMESTAMP)) as "JUMLAH HARI" from a ), gbo as (  select      "ID BARANG",     "BARANG",     "BARANG GABUNGAN",     SUM("QTY") as "JUMLAH PENJUALAN",     (select "JUMLAH BULAN" from gbb) as "JUMLAH BULAN",     round(SUM("QTY")::numeric/(select "JUMLAH BULAN" from gbb), 2\) as "AVG JUMLAH PENJUALAN PERBULAN",     (select "JUMLAH HARI" from gbb) as "JUMLAH HARI",     round(SUM("QTY")::numeric/(select "JUMLAH HARI" from gbb), 2\) as "AVG JUMLAH PENJUALAN hari"  from a  group by "ID BARANG", "BARANG", "BARANG GABUNGAN"  ), gba as (   select      gbo.\*,     hargapokok as "HARGA POKOK",     stockmin as "STOK MIN",     stockmax as "STOK MAX",     "AVG JUMLAH PENJUALAN PERBULAN" \* hargapokok as "RP"  from gbo  inner join (     select id, hargapokok, stockmin, stockmax     from public.wf\_ms\_barangs     where "deletedAt" is null       and hargapokok is not null  ) h on h.id \= gbo."ID BARANG" ), \-- Gabungkan varian supplier (Rp dijumlah dari Rp per ID, harga pokok \= rata-rata tertimbang) gbm as (  select     min("ID BARANG") as "ID BARANG",     "BARANG GABUNGAN" as "BARANG",     string\_agg(distinct "ID BARANG"::text, ',') as "ID ASLI",     sum("JUMLAH PENJUALAN") as "JUMLAH PENJUALAN",     max("JUMLAH BULAN") as "JUMLAH BULAN",     sum("AVG JUMLAH PENJUALAN PERBULAN") as "AVG JUMLAH PENJUALAN PERBULAN",     max("JUMLAH HARI") as "JUMLAH HARI",     sum("AVG JUMLAH PENJUALAN hari") as "AVG JUMLAH PENJUALAN hari",     sum("RP") / nullif(sum("AVG JUMLAH PENJUALAN PERBULAN"), 0\) as "HARGA POKOK",     sum("STOK MIN") as "STOK MIN",     sum("STOK MAX") as "STOK MAX",     sum("RP") as "RP"  from gba  group by "BARANG GABUNGAN" ), h as (  select sum("RP") as "TOTAL"  from gbm ), u as (  select      \*,     (select "TOTAL" from h),     ROUND((("RP"::numeric / (select "TOTAL" from h)) \* 100)::numeric, 3\) as "PERSENTASE",     sum(ROUND((("RP"::numeric / (select "TOTAL" from h)) \* 100)::numeric, 3)) over (order by (ROUND((("RP"::numeric / (select "TOTAL" from h)) \* 100)::numeric, 3)) desc) as "KUMULATIF PENGGUNAAN" from gbm order by ROUND((("RP"::numeric / (select "TOTAL" from h)) \* 100)::numeric, 3\) desc ), pareto as ( select      u.\*,     CASE          WHEN "KUMULATIF PENGGUNAAN" \<= 70 THEN 'A'         WHEN "KUMULATIF PENGGUNAAN" \<= 90 THEN 'B'         ELSE 'C'     END AS kategori\_abc from u ), \-- \============================================================ \-- DATA HARIAN UNTUK FORECASTING \-- \============================================================ base\_harian as ( select      mvp."ID BARANG",     mvp."BARANG",     trim(regexp\_replace(upper(mvp."BARANG"), '\\s\*${[}^{(})]*$\\s\*\$', '')) as "BARANG GABUNGAN",     date\_trunc('day', mvp."TGL JUAL"::timestamp)::date as tanggal,     SUM(mvp."QTY") as qty\_total from emr\_view.mv\_validasi\_penjualan mvp  LEFT JOIN public.transaksi\_detail\_barangs p ON p.id \= mvp."ID TRANSAKSI" left join (     select id, is\_active     from public.wf\_ms\_barangs wmb      where wmb."deletedAt" is null       and wmb.hargapokok is not null ) b on b.id \= mvp."ID BARANG" where mvp.tarif\_cbg \= 'obat' and mvp."TGL JUAL"::timestamp \>= '2026-03-01' and mvp."TGL JUAL"::timestamp \<  '2026-10-01' AND mvp."ID KUNJUNGAN" IS NOT NULL and p."deletedAt" IS null and is\_active is true and mvp."HARGA POKOK" is not null group by      mvp."ID BARANG",     mvp."BARANG",     trim(regexp\_replace(upper(mvp."BARANG"), '\\s\*${[}^{(})]*$\\s\*\$', '')),     date\_trunc('day', mvp."TGL JUAL"::timestamp)::date ), \-- Jumlahkan qty harian semua varian supplier harian\_gab as (  select "BARANG GABUNGAN", tanggal, sum(qty\_total) as qty\_total  from base\_harian  group by "BARANG GABUNGAN", tanggal ), \-- Sisa stok dijumlah dari semua ID varian stok\_gab as (  select m."BARANG GABUNGAN", sum(wi.qty) as "SISA STOK"  from (select distinct "ID BARANG", "BARANG GABUNGAN" from base\_harian) m  join public.wf\_inventories wi    on wi.barang\_id \= m."ID BARANG" and wi."deletedAt" is null  group by m."BARANG GABUNGAN" ) \-- \============================================================ \-- OUTPUT: harian × label Pareto (per obat gabungan) \-- \============================================================ select      hg.tanggal,     p."ID BARANG",     hg."BARANG GABUNGAN" as "BARANG",     hg.qty\_total,     p.kategori\_abc,     p."PERSENTASE",     p."KUMULATIF PENGGUNAAN",     p."HARGA POKOK",     p."STOK MIN",     p."STOK MAX",     s."SISA STOK" from harian\_gab hg left join pareto p on p."BARANG" \= hg."BARANG GABUNGAN" left join stok\_gab s on s."BARANG GABUNGAN" \= hg."BARANG GABUNGAN" order by hg."BARANG GABUNGAN", hg.tanggal;  |
| :---- |

---

## **▼ [HAK KELAS BED](#▼-hak-kelas-bed)**  {#▼-hak-kelas-bed}

| WITH ek AS (     SELECT DISTINCT ON (ek."ID REGISTRASI")         ek."ID REGISTRASI"::text AS id\_registrasi,         ek."KELAS RAWAT"     FROM emr\_view.mv\_dashboard\_eklaim\_2024 ek     ORDER BY ek."ID REGISTRASI" ), ri AS (     SELECT         ri.\*,         b.nama\_kelas AS "NAMA KELAS",         ek."KELAS RAWAT" AS kelas\_tagih,         NULLIF(trim(ek."KELAS RAWAT"::text), '') AS kelas\_tagih\_norm,         \-- normalisasi: "KELAS I" / "KELAS 1" \-\> '1'         CASE upper(trim(regexp\_replace(ri."HAK KELAS BPJS", '^\\s\*KELAS\\s\*', '', 'i')))             WHEN 'I' THEN '1' WHEN 'II' THEN '2' WHEN 'III' THEN '3'             ELSE upper(trim(regexp\_replace(ri."HAK KELAS BPJS", '^\\s\*KELAS\\s\*', '', 'i')))         END AS hak\_kelas\_norm,         CASE upper(trim(regexp\_replace(b.nama\_kelas, '^\\s\*KELAS\\s\*', '', 'i')))             WHEN 'I' THEN '1' WHEN 'II' THEN '2' WHEN 'III' THEN '3'             ELSE upper(trim(regexp\_replace(b.nama\_kelas, '^\\s\*KELAS\\s\*', '', 'i')))         END AS kelas\_bed\_norm,         CASE             WHEN DATE\_PART('day', ri."WAKTU PULANG"::timestamp \- ri."TGL REGISTRASI RANAP"::timestamp) \= 0 THEN 1             ELSE DATE\_PART('day', ri."WAKTU PULANG"::timestamp \- ri."TGL REGISTRASI RANAP"::timestamp) \+ 1         END AS "LOS"     FROM emr\_view.mv\_rawat\_inap ri     left join (SELECT mb\_1.id,                       mb\_1.name AS nama\_bed,                       mb\_1.kelas\_id,                       mb\_1.kamar\_id,                       mkk.nama\_kelas                FROM ms\_beds mb\_1                LEFT JOIN (SELECT mk\_1.id,                                  mk\_1.name AS nama\_kelas,                                  mk\_1.remark                           FROM ms\_kelaskamars mk\_1                           WHERE mk\_1."deletedAt" IS NULL) mkk ON mkk.id \= mb\_1.kelas\_id) b on b.nama\_bed \= ri."NAMA BED"     LEFT JOIN ek ON ek.id\_registrasi \= ri."ID REGISTRASI RANAP"::text     WHERE ri."TGL REGISTRASI RANAP"::timestamp \>= '2026-01-01'     and "NAMA ASURANSI" \= 'BPJS'     \--  AND ri.waktu\_dihapus IS NULL ), sesuai AS (     SELECT         "ID REGISTRASI RANAP",         COALESCE(             bool\_or(                 kelas\_bed\_norm \= hak\_kelas\_norm                 AND date\_start::timestamp \<= "TGL REGISTRASI RANAP"::timestamp \+ interval '72 hours'             ), false         ) AS pernah\_sesuai,         COALESCE(             bool\_or(                 kelas\_bed\_norm \= kelas\_tagih\_norm                 AND date\_start::timestamp \<= "TGL REGISTRASI RANAP"::timestamp \+ interval '72 hours'             ), false         ) AS pernah\_sesuai\_tagih,         string\_agg(DISTINCT "NAMA KELAS", ', ') AS riwayat\_kelas     FROM ri     GROUP BY "ID REGISTRASI RANAP" ), last\_bed AS (     SELECT DISTINCT ON ("ID REGISTRASI RANAP") \*     FROM ri     ORDER BY "ID REGISTRASI RANAP", date\_start DESC NULLS LAST ) SELECT     lb."ID REGISTRASI RANAP",     lb."ID REGISTRASI ASAL",     lb."TGL REGISTRASI RANAP"::timestamp AS "TGL REGISTRASI RANAP",     lb."NO RM",     lb."NAMA PASIEN",     lb."TGL LAHIR",     lb."UMUR",     lb."JENIS KELAMIN",     lb."DPJP RAWAT INAP",     lb."SPESIALIS RAWAT INAP",     lb."NAMA ASURANSI",     lb."HAK KELAS BPJS",     lb."NAMA RUANG",     lb."NAMA KAMAR",     lb."NAMA BED"   AS "BED TERAKHIR",     lb."NAMA KELAS" AS "KELAS BED TERAKHIR",     s.riwayat\_kelas AS "RIWAYAT KELAS BED",     CASE         WHEN lb."NAMA ASURANSI" \<\> 'BPJS' THEN 'Non BPJS'         WHEN s.pernah\_sesuai THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI",     case         when lb."WAKTU PULANG" is null then 'Belum Pulang'         when lb.kelas\_bed\_norm \= lb.hak\_kelas\_norm then 'Sesuai'         else 'Tidak Sesuai'     end as "STATUS BED SESUAI (PULANG)",     case         when lb."WAKTU PULANG" is null then 'Belum Pulang'         WHEN lb."NAMA ASURANSI" \<\> 'BPJS' THEN 'Non BPJS'         WHEN s.pernah\_sesuai and lb.kelas\_bed\_norm \= lb.hak\_kelas\_norm THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI KESELURUHAN",     \-- \===== tambahan: berdasarkan kelas yang ditagihkan (e-klaim) \=====     lb.kelas\_tagih AS "KELAS DITAGIHKAN",     CASE         WHEN lb.kelas\_tagih\_norm IS NULL THEN 'Belum Ditagihkan'         WHEN s.pernah\_sesuai\_tagih THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI (KLAIM)",     CASE         WHEN lb."WAKTU PULANG" IS NULL THEN 'Belum Pulang'         WHEN lb.kelas\_tagih\_norm IS NULL THEN 'Belum Ditagihkan'         WHEN lb.kelas\_bed\_norm \= lb.kelas\_tagih\_norm THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI (PULANG) (KLAIM)",     CASE         WHEN lb."WAKTU PULANG" IS NULL THEN 'Belum Pulang'         WHEN lb.kelas\_tagih\_norm IS NULL THEN 'Belum Ditagihkan'         WHEN s.pernah\_sesuai\_tagih AND lb.kelas\_bed\_norm \= lb.kelas\_tagih\_norm THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "STATUS BED SESUAI KESELURUHAN (KLAIM)",     \-- \=================================================================     lb."DIAGNOSA UTAMA",     lb."DIAGNOSA SEKUNDER",     lb."PROSEDUR UTAMA",     lb."PROSEDUR SEKUNDER",     lb."WAKTU PULANG"::timestamp AS "WAKTU PULANG",     lb."Cara keluar",     lb."LOS" FROM last\_bed lb JOIN sesuai s ON s."ID REGISTRASI RANAP" \= lb."ID REGISTRASI RANAP"  |
| :---- |

---

## **▶ Jadwal Praktek Dokter \-forecast obat**

| SELECT DISTINCT     sd."WAKTU REVISI"::DATE AS tanggal,     REGEXP\_REPLACE(TRIM(rj."DOKTER"), '(\\m\[\[:alpha:\]\])\[\[:alpha:\]\]+(?\!\[.\[:alpha:\]\])', '\\1\*\*\*', 'g') AS dokter\_sensor,     rj."SPESIALIS" FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj  LEFT JOIN (     SELECT         a.schedule\_doctor\_id,         a.registration\_id,         (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",         (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",         (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",         (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"     FROM public.antrianlists a     LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif     LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id ) sd ON sd.registration\_id \= rj."ID REGISTRASI" WHERE sd."WAKTU ASLI" IS NOT NULL    AND sd."WAKTU REVISI" IS NOT NULL   AND (         sd."WAKTU REVISI"::DATE BETWEEN '2026-09-17' AND '2026-09-29'      OR sd."WAKTU REVISI"::DATE BETWEEN '2026-10-01' AND '2026-10-14'   )   AND UPPER(REGEXP\_REPLACE(TRIM(rj."SPESIALIS"), '\\s+', ' ', 'g')) NOT IN (       'AKUPUNKTUR',       'ANESTESI',       'FISIOTERAPI',       'GIGI UMUM',       'GIZI KLINIK',       'KEDOKTERAN OKUPASI',       'LAKTASI',       'MCU',       'MEMORI',       'OKUPASI TERAPIS',       'PSIKOLOGI KLINIS',       'RADIOLOGI',       'TERAPI NYERI',       'TERAPI PERILAKU',       'TERAPI WICARA'   ) ORDER BY tanggal, rj."SPESIALIS", dokter\_sensor;  |
| :---- |

## ---

## **▼ Skor Pareto Spesialis 2025 \- 2026  \-forecast obat**

| WITH pareto AS (     SELECT t.\*,            SUM(t.jml\_kunjungan) OVER (ORDER BY t.jml\_kunjungan DESC, t."DOKTER")            \* 100.0            / SUM(t.jml\_kunjungan) OVER () AS persen\_kumulatif     FROM (         SELECT rj."SPESIALIS",                rj."DOKTER",                COUNT(DISTINCT rj."ID REGISTRASI") AS jml\_kunjungan         FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj         WHERE rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2025-01-01'           AND UPPER(REGEXP\_REPLACE(TRIM(rj."SPESIALIS"), '\\s+', ' ', 'g')) NOT IN (               'AKUPUNKTUR',               'ANESTESI',               'FISIOTERAPI',               'GIGI UMUM',               'GIZI KLINIK',               'KEDOKTERAN OKUPASI',               'LAKTASI',               'MCU',               'MEMORI',               'OKUPASI TERAPIS',               'PSIKOLOGI KLINIS',               'RADIOLOGI',               'TERAPI NYERI',               'TERAPI PERILAKU',               'TERAPI WICARA'           )         GROUP BY rj."SPESIALIS", rj."DOKTER"     ) t ), kategori\_dokter AS (     SELECT p."SPESIALIS",            p."DOKTER",            CASE WHEN p.persen\_kumulatif \<= 50 THEN 'A'                 WHEN p.persen\_kumulatif \<= 90 THEN 'B'                 ELSE 'C' END AS kategori\_pareto,            CASE WHEN p.persen\_kumulatif \<= 50 THEN 3                 WHEN p.persen\_kumulatif \<= 90 THEN 2                 ELSE 1 END AS skor     FROM pareto p ), harian AS (     SELECT rj."TANGGAL REGISTRASI"::DATE AS tanggal,            rj."SPESIALIS",            rj."DOKTER"     FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj     WHERE rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2025-01-01'       AND UPPER(REGEXP\_REPLACE(TRIM(rj."SPESIALIS"), '\\s+', ' ', 'g')) NOT IN (           'AKUPUNKTUR',           'ANESTESI',           'FISIOTERAPI',           'GIGI UMUM',           'GIZI KLINIK',           'KEDOKTERAN OKUPASI',           'LAKTASI',           'MCU',           'MEMORI',           'OKUPASI TERAPIS',           'PSIKOLOGI KLINIS',           'RADIOLOGI',           'TERAPI NYERI',           'TERAPI PERILAKU',           'TERAPI WICARA'       )     GROUP BY 1, 2, 3 ), skor\_harian AS (     SELECT h.tanggal,            UPPER(REGEXP\_REPLACE(TRIM(h."SPESIALIS"), '\\s+', ' ', 'g')) AS spesialis\_rapi,            k.skor     FROM harian h     JOIN kategori\_dokter k       ON k."SPESIALIS" \= h."SPESIALIS"      AND k."DOKTER" \= h."DOKTER" ) SELECT s.tanggal,        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'BEDAH ANAK'), 0\)                      AS "BEDAH ANAK",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'LABORATORIUM'), 0\)                    AS "LABORATORIUM",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'PENYAKIT DALAM'), 0\)                  AS "PENYAKIT DALAM",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'JANTUNG'), 0\)                         AS "JANTUNG",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'KONSERVASI GIGI'), 0\)                 AS "KONSERVASI GIGI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'UMUM'), 0\)                            AS "UMUM",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'BEDAH MULUT'), 0\)                     AS "BEDAH MULUT",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'PROSTHODONTI'), 0\)                    AS "PROSTHODONTI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'REHABILITASI MEDIK'), 0\)              AS "REHABILITASI MEDIK",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'BEDAH VASCULAR & ENDOVASCULAR'), 0\)   AS "BEDAH VASCULAR & ENDOVASCULAR",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'ANAK'), 0\)                            AS "ANAK",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'BEDAH UMUM'), 0\)                      AS "BEDAH UMUM",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'PARU'), 0\)                            AS "PARU",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'THT \- KL'), 0\)                        AS "THT \- KL",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'PERIODONTI'), 0\)                      AS "PERIODONTI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'KANDUNGAN'), 0\)                       AS "KANDUNGAN",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'GIGI RADIOLOGI'), 0\)                  AS "GIGI RADIOLOGI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'KEDOKTERAN JIWA'), 0\)                 AS "KEDOKTERAN JIWA",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'HEMODIALISA'), 0\)                     AS "HEMODIALISA",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'ORTHOPEDI'), 0\)                       AS "ORTHOPEDI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'KULIT & KELAMIN'), 0\)                 AS "KULIT & KELAMIN",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'UROLOGI'), 0\)                         AS "UROLOGI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'ANAK NEUROLOGI'), 0\)                  AS "ANAK NEUROLOGI",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'BEDAH SYARAF'), 0\)                    AS "BEDAH SYARAF",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'SARAF'), 0\)                           AS "SARAF",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'MATA'), 0\)                            AS "MATA",        COALESCE(SUM(s.skor) FILTER (WHERE s.spesialis\_rapi \= 'KEDOKTERAN GIGI ANAK'), 0\)            AS "KEDOKTERAN GIGI ANAK",        SUM(s.skor)                                                                                   AS total\_skor FROM skor\_harian s GROUP BY s.tanggal ORDER BY s.tanggal; \-- SELECT DISTINCT "SPESIALIS" FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan  |
| :---- |

---

## **▶ Kategori Pareto Dokter  \-forecast obat**

| WITH pareto AS (     SELECT t.\*,            SUM(t.jml\_kunjungan) OVER (ORDER BY t.jml\_kunjungan DESC, t."DOKTER")            \* 100.0            / SUM(t.jml\_kunjungan) OVER () AS persen\_kumulatif     FROM (         SELECT rj."SPESIALIS",                rj."DOKTER",                COUNT(DISTINCT rj."ID REGISTRASI") AS jml\_kunjungan         FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj         WHERE rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2025-01-01'         GROUP BY rj."SPESIALIS", rj."DOKTER"     ) t ) SELECT p."SPESIALIS",       REGEXP\_REPLACE(TRIM(p."DOKTER"), '(\\m\[\[:alpha:\]\])\[\[:alpha:\]\]+(?\!\[.\[:alpha:\]\])', '\\1\*\*\*', 'g') AS dokter\_sensor,       \-- p."DOKTER",        p.jml\_kunjungan,       REPLACE(ROUND(p.persen\_kumulatif, 2)::TEXT, '.', ',') AS persen\_kumulatif,              CASE WHEN p.persen\_kumulatif \<= 50 THEN 'A'             WHEN p.persen\_kumulatif \<= 90 THEN 'B'             ELSE 'C' END AS kategori\_pareto FROM pareto p WHERE p."SPESIALIS" NOT IN (       'AKUPUNKTUR',       'ANESTESI',       'FISIOTERAPI',       'GIGI Umum',       'GIZI KLINIK',       'KEDOKTERAN OKUPASI',       'LAKTASI',       'MCU',       'MEMORI',       'OKUPASI TERAPIS',       'PSIKOLOGI KLINIS',       'RADIOLOGI',       'TERAPI NYERI',       'TERAPI PERILAKU',       'TERAPI WICARA'     ) ORDER BY p.jml\_kunjungan DESC, p."DOKTER";  |
| :---- |

## ---

## **▼ Kepatuhan RJ \+ Mingguan**

| SELECT      sub.\*,          \-- KATEGORI 2: Level Sesi Praktik (ID PRAKTEK)     \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub.kategori\_pasien \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."ID PRAKTEK"         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_SESI",     \-- KATEGORI 3: Level Bulanan Dokter     \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan, seluruh baris dokter di bulan itu jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub."KATEGORI" \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_BULANAN",          \-- KATEGORI 4 \= Tidak ada Toleransi Beda Jadwal     CASE          WHEN sub."WAKTU ASLI" \= sub."WAKTU REVISI"              AND sub."WAKTU SELESAI ASLI" \= sub."WAKTU SELESAI REVISI"         THEN 'Sesuai'         ELSE 'Tidak Sesuai'     END AS "KATEGORI\_4",            \-- KATEGORI 5: Level Sesi Praktik (ID PRAKTEK)     \-- Jika ada \>= 1 pasien tidak sesuai di sesi tersebut, seluruh sesi jadi 'Tidak Sesuai'     CASE          WHEN COUNT(CASE WHEN sub.kategori\_pasien5 \= 'Tidak Sesuai' THEN 1 END) OVER (             PARTITION BY sub."ID PRAKTEK"         ) \> 0 THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_5",          \-- KATEGORI 6: Level Bulanan Dokter2     \-- Jika ada \>= 1 catatan tidak sesuai dalam 1 bulan (Kategori 4), seluruh baris dokter di bulan itu jadi 'Tidak Sesuai' \-- KATEGORI 6: Level Bulanan Dokter berdasarkan KATEGORI 4     CASE          WHEN COUNT(             CASE                  WHEN sub."WAKTU ASLI" \<\> sub."WAKTU REVISI"                   OR sub."WAKTU SELESAI ASLI" \<\> sub."WAKTU SELESAI REVISI"                 THEN 1             END         ) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('month', sub."TGL REGIS")         ) \> 0          THEN 'Tidak Sesuai'         ELSE 'Sesuai'     END AS "KATEGORI\_6",          \-- KATEGORI 7 : toleransi 30 menit sebelum task id 4     sub.kategori\_task4 AS "KATEGORI REAL",        \-- CASE    \--       WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '30 minutes')    \--         AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')   \--       THEN 'Sesuai'            \--       WHEN sub."TASK 4 PERTAMA" BETWEEN (sub."WAKTU ASLI" \- INTERVAL '60 minutes')   \--                                     AND (sub."WAKTU ASLI" \- INTERVAL '30 minutes')   \--       THEN 'Mulai Lebih Awal 30 Menit \- 1 Jam'            \--       \-- Urutan dibalik: \+30 menit dulu (batas bawah), baru \+60 menit (batas atas)   \--       WHEN sub."TASK 4 PERTAMA" BETWEEN (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')   \--                                     AND (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')   \--       THEN 'Mulai Lebih Akhir 30 Menit \- 1 Jam'            \--       WHEN sub."TASK 4 PERTAMA" \< (sub."WAKTU ASLI" \- INTERVAL '1 hour')   \--       THEN 'Mulai Lebih Awal \> 1 Jam'            \--       WHEN sub."TASK 4 PERTAMA" \> (sub."WAKTU ASLI" \+ INTERVAL '1 hour')   \--       THEN 'Mulai Lebih Akhir \> 1 Jam'            \--       ELSE 'Tidak Sesuai'   \--   END AS "KATEGORI JAM MULAI"       CASE              \-- 1\. Toleransi \+- 30 Menit (Misal Jadwal 09:00 \-\> 08:30:00 s/d 09:30:00)             WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '30 minutes')               AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')             THEN 'Sesuai'                          \-- 2\. Lebih Awal 30 Menit \- 1 Jam (Misal Jadwal 09:00 \-\> 08:00:00 s/d 08:29:59)             WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '60 minutes')              AND sub."TASK 4 PERTAMA" \<  (sub."WAKTU ASLI" \- INTERVAL '30 minutes')             THEN 'Mulai Lebih Awal 30 Menit \- 1 Jam'                          \-- 3\. Lebih Akhir 30 Menit \- 1 Jam (Misal Jadwal 09:00 \-\> 09:30:01 s/d 10:00:00)             WHEN sub."TASK 4 PERTAMA" \>  (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')              AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir 30 Menit \- 1 Jam'                          \-- 4\. Lebih Awal \> 1 Jam (Misal Jadwal 09:00 \-\> di bawah 08:00:00)             WHEN sub."TASK 4 PERTAMA" \< (sub."WAKTU ASLI" \- INTERVAL '60 minutes')             THEN 'Mulai Lebih Awal \> 1 Jam'                          \-- 5\. Lebih Akhir \> 1 Jam (Misal Jadwal 09:00 \-\> di atas 10:00:00)             WHEN sub."TASK 4 PERTAMA" \> (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir \> 1 Jam'                          ELSE 'Lainnya'         END AS "KATEGORI JAM MULAI",              \--   CASE       \--     WHEN COUNT(CASE WHEN sub.kategori\_task4 \= 'Tidak Sesuai' THEN 1 END) OVER (     \--         PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")     \--     ) \> 0 THEN 'Tidak Sesuai'     \--     ELSE 'Sesuai'     \-- END AS "KATEGORI REAL MINGGUAN" CASE     \-- semua sesi Sesuai     WHEN COUNT(CASE WHEN sub.kategori\_task4 \= 'Sesuai' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          ) \= COUNT(\*) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          )     THEN 'Sesuai'     \-- semua sesi tanpa kunjungan     WHEN COUNT(CASE WHEN sub.kategori\_task4 \= 'Tidak Ada Kunjungan' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          ) \= COUNT(\*) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          )     THEN 'Tidak Ada Kunjungan'     \-- selain itu: ada Tidak Sesuai, atau campuran Sesuai \+ Tidak Ada Kunjungan     ELSE 'Tidak Sesuai' END AS "KATEGORI REAL MINGGUAN" FROM (     SELECT          rj.\*,         rj."TANGGAL REGISTRASI"::TIMESTAMP AS "TGL REGIS",         ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id AS "ID PRAKTEK",         sd.schedule\_doctor\_id,         sd."WAKTU ASLI",         sd."WAKTU REVISI",         sd."WAKTU SELESAI ASLI",         sd."WAKTU SELESAI REVISI",         \-- Evaluasi internal pasien (hanya dipakai window function di atas)         CASE             WHEN rj."TANGGAL REGISTRASI"::TIMESTAMP                  BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'                      AND sd."WAKTU SELESAI ASLI"             THEN 'Sesuai'             ELSE 'Tidak Sesuai'         END AS kategori\_pasien,         CASE             WHEN ak."TANGGAL INPUT ASKEP"::TIMESTAMP                  BETWEEN sd."WAKTU ASLI" \- INTERVAL '1 hour'                      AND sd."WAKTU SELESAI ASLI"             THEN 'Sesuai'             ELSE 'Tidak Sesuai'         END AS kategori\_pasien5,                  \-- t4."TASK 4",         t4."TASK 1",         t4."TASK 2",         t4."TASK 3",         t4."TASK 4",         MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id         ) AS "TASK 4 PERTAMA",         \-- Level sesi: pasien pertama task\_id\_4 maks 30 menit sebelum jadwal asli         \-- CASE         \--     WHEN MIN(t4."TASK 4") OVER (         \--             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id         \--         )         \--         BETWEEN sd."WAKTU ASLI" \- INTERVAL '60 minutes'         \--             AND sd."WAKTU ASLI" \+ INTERVAL '60 minutes'         \--     THEN 'Sesuai'         \--     ELSE 'Tidak Sesuai'         \-- END AS kategori\_task4,                  CASE     WHEN MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id          ) IS NULL     THEN 'Tidak Ada Kunjungan'     WHEN MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id          )          BETWEEN sd."WAKTU ASLI" \- INTERVAL '60 minutes'              AND sd."WAKTU ASLI" \+ INTERVAL '60 minutes'     THEN 'Sesuai'     ELSE 'Tidak Sesuai' END AS kategori\_task4,                                    CASE             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \<= 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \> 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NOT NULL AND ABS(DATE\_PART('epoch', sd."WAKTU REVISI"::TIMESTAMP \- sd."WAKTU ASLI"::TIMESTAMP)) / 60 \> 60                  AND ABS(DATE\_PART('epoch', sd."WAKTU SELESAI REVISI"::TIMESTAMP \- sd."WAKTU SELESAI ASLI"::TIMESTAMP)) / 60 \<= 60 THEN 'Tidak Sesuai'             WHEN sd."WAKTU REVISI" IS NOT NULL AND sd."WAKTU ASLI" IS NULL THEN 'Sesuai'             WHEN sd."WAKTU ASLI" IS NOT NULL AND sd."WAKTU REVISI" IS NULL THEN 'Tidak Sesuai'         END AS "KATEGORI"     FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj      LEFT JOIN (         SELECT             a.schedule\_doctor\_id,             a.registration\_id,             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"         FROM public.antrianlists a         LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif         LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id     ) sd ON sd.registration\_id \= rj."ID REGISTRASI"     LEFT JOIN (         select              ak.id\_kunjungan,             ak.inserted\_date \+ interval '7 hours' as "TANGGAL INPUT ASKEP"         from emr\_rawat\_jalan.asesmen\_keperawatan ak          where ak.deleted\_date is null         ) ak on ak.id\_kunjungan \= rj."ID REGISTRASI"     LEFT JOIN (         SELECT             jkn.id\_registrations,             MAX(CASE WHEN jkn.task\_id \= 1 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 1",             MAX(CASE WHEN jkn.task\_id \= 2 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 2",             MAX(CASE WHEN jkn.task\_id \= 3 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 3",             MAX(CASE WHEN jkn.task\_id \= 4 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 4"         FROM public.antrianjkn jkn         WHERE jkn.task\_id IN (1, 2, 3, 4\)           AND jkn.terkirim IS TRUE         GROUP BY jkn.id\_registrations     ) t4 ON t4.id\_registrations \= rj."ID REGISTRASI"     WHERE sd."WAKTU ASLI" IS NOT NULL        AND sd."WAKTU REVISI" IS NOT NULL       AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01'       AND rj."SPESIALIS" NOT IN (       'AKUPUNKTUR',       'ANESTESI',       'FISIOTERAPI',       'GIGI Umum',       'GIZI KLINIK',       'KEDOKTERAN OKUPASI',       'LAKTASI',       'MCU',       'MEMORI',       'OKUPASI TERAPIS',       'PSIKOLOGI KLINIS',       'RADIOLOGI',       'TERAPI NYERI',       'TERAPI PERILAKU',       'TERAPI WICARA'     )        ) sub  |
| :---- |

---

## **▶ Master Barang EMR Gudang Gizi**

| SELECT  \-- wl.\*, wl.name, \-- wm.name as "satuan",   CASE UPPER(TRIM(wm.name))     WHEN 'LUSIN' THEN 'lsn'     WHEN 'BOTOL' THEN 'btl'     WHEN 'GALON' THEN 'gln'     WHEN 'LITER' THEN 'ltr'     WHEN 'PAPAN' THEN 'ppn'     ELSE LOWER(TRIM(wm.name))   END AS satuan, wl.hargapokok as "harga master", wl.persediaan as "stok\_sekarang", wl.hargabeli as "harga\_real" \-- btl lsn FROM wl\_ms\_barangs wl LEFT JOIN wm\_ms\_satuans wm on wm.id \=  wl.satuanbeli\_id WHERE   wl."deletedBy" is NULL  |
| :---- |

---

## **▼ [Kepatuhan Jadwal Dokter](#▼-kepatuhan-jadwal-dokter)** {#▼-kepatuhan-jadwal-dokter}

| with data as ( SELECT      sub.\*,     sub.kategori\_task4 AS "KATEGORI REAL",         CASE              WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '30 minutes')               AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')             THEN 'Sesuai'             WHEN sub."TASK 4 PERTAMA" \>= (sub."WAKTU ASLI" \- INTERVAL '60 minutes')              AND sub."TASK 4 PERTAMA" \<  (sub."WAKTU ASLI" \- INTERVAL '30 minutes')             THEN 'Mulai Lebih Awal 30 Menit \- 1 Jam'             WHEN sub."TASK 4 PERTAMA" \>  (sub."WAKTU ASLI" \+ INTERVAL '30 minutes')              AND sub."TASK 4 PERTAMA" \<= (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir 30 Menit \- 1 Jam'             WHEN sub."TASK 4 PERTAMA" \< (sub."WAKTU ASLI" \- INTERVAL '60 minutes')             THEN 'Mulai Lebih Awal \> 1 Jam'             WHEN sub."TASK 4 PERTAMA" \> (sub."WAKTU ASLI" \+ INTERVAL '60 minutes')             THEN 'Mulai Lebih Akhir \> 1 Jam'             ELSE 'Lainnya'         END AS "KATEGORI JAM MULAI", CASE     WHEN COUNT(CASE WHEN sub.kategori\_task4 \= 'Sesuai' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          ) \= COUNT(\*) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          )     THEN 'Sesuai'     WHEN COUNT(CASE WHEN sub.kategori\_task4 \= 'Tidak Ada Kunjungan' THEN 1 END) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          ) \= COUNT(\*) OVER (             PARTITION BY sub."DOKTER", DATE\_TRUNC('week', sub."TGL REGIS")          )     THEN 'Tidak Ada Kunjungan'     ELSE 'Tidak Sesuai' END AS "KATEGORI REAL MINGGUAN" FROM (     SELECT          rj.\*,         rj."TANGGAL REGISTRASI"::TIMESTAMP AS "TGL REGIS",         ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id AS "ID PRAKTEK",         sd.schedule\_doctor\_id,         sd."WAKTU ASLI",         sd."WAKTU REVISI",         sd."WAKTU SELESAI ASLI",         sd."WAKTU SELESAI REVISI",         t4."TASK 1",         t4."TASK 2",         t4."TASK 3",         t4."TASK 4",         MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id         ) AS "TASK 4 PERTAMA",         CASE     WHEN MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id          ) IS NULL     THEN 'Tidak Ada Kunjungan'     WHEN MIN(t4."TASK 4") OVER (             PARTITION BY ((rj."TANGGAL REGISTRASI"::TIMESTAMP)::DATE)::TEXT \|\| sd.schedule\_doctor\_id          )          BETWEEN sd."WAKTU ASLI" \- INTERVAL '60 minutes'              AND sd."WAKTU ASLI" \+ INTERVAL '60 minutes'     THEN 'Sesuai'     ELSE 'Tidak Sesuai' END AS kategori\_task4     FROM emr\_view.mv\_validasi\_kunjungan\_rawat\_jalan rj      LEFT JOIN (         SELECT             a.schedule\_doctor\_id,             a.registration\_id,             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_start)::TIMESTAMP   AS "WAKTU ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_start)::TIMESTAMP        AS "WAKTU REVISI",             (jda.tanggal\_asli::TEXT \|\| ' ' \|\| sda.time\_finish)::TIMESTAMP  AS "WAKTU SELESAI ASLI",             (jda.tanggal::TEXT \|\| ' ' \|\| jda.time\_finish)::TIMESTAMP       AS "WAKTU SELESAI REVISI"         FROM public.antrianlists a         LEFT JOIN public.jadwal\_dokter\_aktif jda ON jda.id\_jadwal\_dokter\_aktif \= a.id\_jadwal\_dokter\_aktif         LEFT JOIN public.schedule\_doctors sda ON sda.id \= a.schedule\_doctor\_id         WHERE sda."deletedAt" is NULL AND          a.is\_cancel is FALSE AND a."deletedAt" is NULL      ) sd ON sd.registration\_id \= rj."ID REGISTRASI"     LEFT JOIN (         select              ak.id\_kunjungan,             ak.inserted\_date \+ interval '7 hours' as "TANGGAL INPUT ASKEP"         from emr\_rawat\_jalan.asesmen\_keperawatan ak          where ak.deleted\_date is null         ) ak on ak.id\_kunjungan \= rj."ID REGISTRASI"     LEFT JOIN (         SELECT             jkn.id\_registrations,             MAX(CASE WHEN jkn.task\_id \= 1 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 1",             MAX(CASE WHEN jkn.task\_id \= 2 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 2",             MAX(CASE WHEN jkn.task\_id \= 3 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 3",             MAX(CASE WHEN jkn.task\_id \= 4 THEN jkn.tanggal AT TIME ZONE 'Asia/Jakarta' END) AS "TASK 4"         FROM public.antrianjkn jkn         WHERE jkn.task\_id IN (1, 2, 3, 4\)           AND jkn.terkirim IS TRUE         GROUP BY jkn.id\_registrations     ) t4 ON t4.id\_registrations \= rj."ID REGISTRASI"     WHERE sd."WAKTU ASLI" IS NOT NULL        AND sd."WAKTU REVISI" IS NOT NULL       AND rj."TANGGAL REGISTRASI"::TIMESTAMP \>= '2026-01-01'       AND rj."SPESIALIS" NOT IN (       'AKUPUNKTUR',       'ANESTESI',       'FISIOTERAPI',       'GIGI Umum',       'GIZI KLINIK',       'KEDOKTERAN OKUPASI',       'LAKTASI',       'MCU',       'MEMORI',       'OKUPASI TERAPIS',       'PSIKOLOGI KLINIS',       'RADIOLOGI',       'TERAPI NYERI',       'TERAPI PERILAKU',       'TERAPI WICARA'     )        ) sub ), \-- SELECT DISTINCT \--     ((DATE\_TRUNC('week', d."TGL REGIS")::DATE \- DATE '2026-01-05') / 7\) \+ 1 AS "MINGGU KE", \--     DATE\_TRUNC('week', d."TGL REGIS")::DATE                                   AS "AWAL MINGGU (SENIN)", \--     (DATE\_TRUNC('week', d."TGL REGIS") \+ INTERVAL '6 days')::DATE             AS "AKHIR MINGGU (MINGGU)", \--     d."DOKTER", \--     d."SPESIALIS", \--     d."ID PRAKTEK", \--     d."WAKTU ASLI"::DATE         AS "TANGGAL PRAKTIK", \--     d."WAKTU ASLI"               AS "JADWAL MULAI", \--     d."WAKTU SELESAI ASLI"       AS "JADWAL SELESAI", \--     d."TASK 4 PERTAMA", \--     ROUND(EXTRACT(EPOCH FROM (d."TASK 4 PERTAMA" \- d."WAKTU ASLI")) / 60\) AS "SELISIH (MENIT)", \--     d."KATEGORI REAL"            AS "KATEGORI SESI", \--     d."KATEGORI JAM MULAI", \--     d."KATEGORI REAL MINGGUAN" \-- FROM data d \-- WHERE d."TGL REGIS" \>= DATE '2026-01-05' \-- \-- WHERE d."TGL REGIS" \>= DATE '2026-08-24' \--   AND d."TGL REGIS" \<  DATE\_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') \+ INTERVAL '7 days' \-- ORDER BY "MINGGU KE", d."DOKTER", d."WAKTU ASLI"; sesi AS (     SELECT DISTINCT         DATE\_TRUNC('week', d."TGL REGIS")::DATE      AS awal\_minggu,         d."DOKTER",         d."SPESIALIS",         \-- ❌ hapus d."ID PRAKTEK"         EXTRACT(ISODOW FROM d."TGL REGIS")::INT      AS hari,         d."WAKTU ASLI"                               AS mulai,         d."WAKTU SELESAI ASLI"                       AS selesai,         d."TASK 4 PERTAMA"                           AS task4,         d."KATEGORI REAL"                            AS kategori\_sesi,         d."KATEGORI REAL MINGGUAN"                   AS kategori\_mingguan     FROM data d     WHERE d."TGL REGIS" \>= DATE '2026-01-05'       AND d."TGL REGIS" \<  DATE\_TRUNC('week', NOW() AT TIME ZONE 'Asia/Jakarta') \+ INTERVAL '7 days' ), \-- ✅ sesi\_pertama: tambahkan selesai & task4 sesi\_pertama AS (     SELECT DISTINCT ON (awal\_minggu, "DOKTER", hari)         awal\_minggu,         "DOKTER",         hari,         mulai,         selesai,          \-- ✅ tambah         task4,            \-- ✅ tambah         kategori\_sesi     FROM sesi     ORDER BY awal\_minggu, "DOKTER", hari, mulai ASC ), kategori\_mingguan\_baru AS (     SELECT         awal\_minggu,         "DOKTER",         CASE             WHEN COUNT(CASE WHEN kategori\_sesi \= 'Sesuai'              THEN 1 END) \= COUNT(\*) THEN 'Sesuai'             WHEN COUNT(CASE WHEN kategori\_sesi \= 'Tidak Ada Kunjungan' THEN 1 END) \= COUNT(\*) THEN 'Tidak Ada Kunjungan'             ELSE 'Tidak Sesuai'         END AS kategori\_mingguan\_final     FROM sesi\_pertama     GROUP BY awal\_minggu, "DOKTER" ) \-- ✅ SELECT akhir: pakai sesi\_pertama untuk SEMUA kolom harian SELECT     ((sp.awal\_minggu \- DATE '2026-01-05') / 7\) \+ 1   AS "MINGGU KE",     sp.awal\_minggu                                    AS "AWAL MINGGU (SENIN)",     sp."DOKTER",     STRING\_AGG(DISTINCT s."SPESIALIS", ', ')          AS "SPESIALIS",     MAX(km.kategori\_mingguan\_final)                   AS "KATEGORI REAL MINGGUAN",         \-- SENIN     MAX(CASE WHEN sp.hari \= 1 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "SENIN JADWAL",     MAX(CASE WHEN sp.hari \= 1 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "SENIN TASK 4",     MAX(CASE WHEN sp.hari \= 1 THEN sp.kategori\_sesi END) AS "SENIN KATEGORI",     \-- SELASA     MAX(CASE WHEN sp.hari \= 2 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "SELASA JADWAL",     MAX(CASE WHEN sp.hari \= 2 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "SELASA TASK 4",     MAX(CASE WHEN sp.hari \= 2 THEN sp.kategori\_sesi END) AS "SELASA KATEGORI",     \-- RABU     MAX(CASE WHEN sp.hari \= 3 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "RABU JADWAL",     MAX(CASE WHEN sp.hari \= 3 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "RABU TASK 4",     MAX(CASE WHEN sp.hari \= 3 THEN sp.kategori\_sesi END) AS "RABU KATEGORI",     \-- KAMIS     MAX(CASE WHEN sp.hari \= 4 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "KAMIS JADWAL",     MAX(CASE WHEN sp.hari \= 4 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "KAMIS TASK 4",     MAX(CASE WHEN sp.hari \= 4 THEN sp.kategori\_sesi END) AS "KAMIS KATEGORI",     \-- JUMAT     MAX(CASE WHEN sp.hari \= 5 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "JUMAT JADWAL",     MAX(CASE WHEN sp.hari \= 5 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "JUMAT TASK 4",     MAX(CASE WHEN sp.hari \= 5 THEN sp.kategori\_sesi END) AS "JUMAT KATEGORI",     \-- SABTU     MAX(CASE WHEN sp.hari \= 6 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "SABTU JADWAL",     MAX(CASE WHEN sp.hari \= 6 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "SABTU TASK 4",     MAX(CASE WHEN sp.hari \= 6 THEN sp.kategori\_sesi END) AS "SABTU KATEGORI",     \-- MINGGU     MAX(CASE WHEN sp.hari \= 7 THEN TO\_CHAR(sp.mulai, 'HH24:MI') \|\| ' \- ' \|\| TO\_CHAR(sp.selesai, 'HH24:MI') END) AS "MINGGU JADWAL",     MAX(CASE WHEN sp.hari \= 7 THEN COALESCE(TO\_CHAR(sp.task4, 'HH24:MI'), '-') END) AS "MINGGU TASK 4",     MAX(CASE WHEN sp.hari \= 7 THEN sp.kategori\_sesi END) AS "MINGGU KATEGORI" FROM sesi\_pertama sp JOIN kategori\_mingguan\_baru km     ON km.awal\_minggu \= sp.awal\_minggu AND km."DOKTER" \= sp."DOKTER" LEFT JOIN sesi s     ON s.awal\_minggu \= sp.awal\_minggu AND s."DOKTER" \= sp."DOKTER"  \-- untuk ambil SPESIALIS GROUP BY sp.awal\_minggu, sp."DOKTER" ORDER BY sp.awal\_minggu, sp."DOKTER";  |
| :---- |

---

## **▶ [Boxplot Peak Hour IGD](#▶-boxplot-peak-hour-igd)** {#▶-boxplot-peak-hour-igd}

| WITH data AS (   SELECT     igd."Id Registrasi",     atg.waktu\_asesmen\_triage                      AS waktu\_triage,     \-- NULLIF(TRIM(igd."Tanggal Pulang"), '')::timestamp AS waktu\_keluar     NULLIF(TRIM(igd."Tanggal Pulang"), '')::timestamp AS waktu\_pulang\_asli,     CASE       WHEN NULLIF(TRIM(igd."Tanggal Pulang"), '')::timestamp              BETWEEN atg.waktu\_asesmen\_triage                  AND atg.waktu\_asesmen\_triage \+ interval '24 hours'       THEN NULLIF(TRIM(igd."Tanggal Pulang"), '')::timestamp       ELSE atg.waktu\_asesmen\_triage \+ interval '24 hours'     END AS waktu\_keluar   FROM emr\_view.mv\_dashboard\_igd igd   LEFT JOIN (     SELECT id\_triage,            MIN(inserted\_date::timestamp \+ interval '7 hour') AS waktu\_asesmen\_triage     FROM emr\_igd.asesmen\_triage     GROUP BY id\_triage   ) atg ON atg.id\_triage \= igd."Id Triage" ), batas AS (   SELECT     date\_trunc('day', MIN(waktu\_triage)) AS mulai,     date\_trunc('day', MAX(waktu\_triage)) \+ interval '23 hours' AS selesai   FROM data   WHERE waktu\_triage IS NOT NULL ), slot AS (   SELECT generate\_series(mulai, selesai, interval '1 hour') AS jam   FROM batas ), masuk AS (   SELECT date\_trunc('hour', waktu\_triage) AS jam,          COUNT(DISTINCT "Id Registrasi") AS jml   FROM data   WHERE waktu\_triage IS NOT NULL   GROUP BY 1 ), keluar AS (   SELECT date\_trunc('hour', waktu\_keluar) AS jam,          COUNT(DISTINCT "Id Registrasi") AS jml   FROM data   WHERE waktu\_triage IS NOT NULL     AND waktu\_keluar \>= waktu\_triage   GROUP BY 1 ), sedang AS (   SELECT s.jam,          COUNT(DISTINCT d."Id Registrasi") AS jml   FROM slot s   \-- JOIN data d   \--   ON d.waktu\_triage \< s.jam \+ interval '1 hour'   \-- AND COALESCE(   \--       CASE WHEN d.waktu\_keluar \>= d.waktu\_triage THEN d.waktu\_keluar END,   \--       d.waktu\_triage \+ interval '24 hours'   \--     ) \> s.jam   JOIN data d   ON d.waktu\_triage \< s.jam \+ interval '1 hour'   AND d.waktu\_keluar \>= s.jam \+ interval '1 hour'      WHERE s.jam \>= '2026-01-01'   GROUP BY s.jam ) SELECT   s.jam::date                   AS tanggal,   EXTRACT(HOUR FROM s.jam)::int AS jam,   COALESCE(m.jml, 0\)            AS pasien\_masuk,   COALESCE(k.jml, 0\)            AS pasien\_keluar,   COALESCE(sd.jml, 0\)           AS pasien\_di\_igd FROM slot s LEFT JOIN masuk  m  ON m.jam  \= s.jam LEFT JOIN keluar k  ON k.jam  \= s.jam LEFT JOIN sedang sd ON sd.jam \= s.jam WHERE s.jam \>= '2026-01-01' ORDER BY s.jam;  |
| :---- |

---

## **▼ \-**

|  |
| :---- |

---

## **▶ \-**

|  |
| :---- |

---

# **3\. Kategori** 

## **▼ LOS**

CASE   
        WHEN to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  IS NULL   
        OR to\_timestamp("WAKTU IRNA AKHIR", 'YYYY-MM-DD HH24:MI:SS')  IS NULL THEN NULL   
        WHEN DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') ) \= DATE\_TRUNC('day', to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') ) THEN '1'::NUMERIC  
        WHEN FLOOR(EXTRACT(EPOCH FROM COALESCE(to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS') , now()) \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )/86400) \= 0 THEN '1'::NUMERIC  
        ELSE EXTRACT(DAY FROM DATE\_TRUNC('day', to\_timestamp("WAKTU PULANG", 'YYYY-MM-DD HH24:MI:SS')  \+ INTERVAL '1 DAY') \- to\_timestamp("TGL REGISTRASI RANAP", 'YYYY-MM-DD HH24:MI:SS') )::NUMERIC  
    END AS "LOS",

---

## **▶ \-**

|  |
| :---- |

## ---

## **▼ \-**

|  |
| :---- |

---

## **▶ \-**

|  |
| :---- |

---

