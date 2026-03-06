$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZkMTkxYi1jMzRkLTQ5OWEtOGE4ZC00OWRmMTRmNjc1YjEiLCJyb2xlIjoiYWRtaW4iLCJicmFuY2hJZCI6IjZlNGU5NTVlLTk1MGEtNDIwYi04N2VkLWQ1ZTZkMGNmOTA5YSIsImlhdCI6MTc3MjczNDM4OSwiZXhwIjoxNzczMzM5MTg5fQ.aVfY699wNnpUuvNWoRog6kOD4XJ94Pw6AWA1ppzRYQc"
$BASE = "https://prohumanapi.arnabbhowmik.in/api"
$HEADERS = @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $TOKEN" }

function Post-Api($url, $body) {
    $json = $body | ConvertTo-Json -Depth 10
    try {
        $resp = Invoke-RestMethod -Uri $url -Method POST -Headers $HEADERS -Body $json
        return $resp
    } catch {
        $msg = $_.Exception.Message
        try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch { $detail = $_.ErrorDetails.Message }
        Write-Host "  ERROR: $msg | $detail" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SEEDING EXERCISES" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$exercises = @(
    @{ name="Ankle Pumps"; category="Lower Limb"; description="Simple ankle dorsiflexion and plantarflexion to improve circulation and ROM."; instructions="Lie flat on your back. Slowly pull your foot up toward you then point it down. Repeat rhythmically."; tags=@("ankle","circulation","ROM","beginner") },
    @{ name="Quad Sets"; category="Lower Limb"; description="Isometric quadriceps contraction to strengthen quads without joint movement."; instructions="Sit with legs extended. Tighten the quadriceps by pressing the back of the knee toward the floor. Hold 5 seconds, release."; tags=@("quadriceps","isometric","knee","post-surgery") },
    @{ name="Straight Leg Raise"; category="Lower Limb"; description="Strengthens hip flexors and quadriceps while keeping the knee stable."; instructions="Lie on your back. Bend one knee, keep other straight. Tighten quad and lift straight leg to 45 degrees. Hold 3 seconds, lower slowly."; tags=@("hip","quadriceps","knee","strengthening") },
    @{ name="Heel Slides"; category="Lower Limb"; description="Restores knee flexion range of motion post-injury or surgery."; instructions="Lie on your back. Slowly slide your heel toward your buttocks bending the knee. Hold at end range 5 seconds, then slide back."; tags=@("knee","ROM","flexibility","post-surgery") },
    @{ name="Calf Raises"; category="Lower Limb"; description="Strengthens gastrocnemius and soleus muscles."; instructions="Stand behind a chair for support. Rise up onto your toes slowly, hold 2 seconds, then lower back down with control."; tags=@("calf","gastrocnemius","soleus","balance","strengthening") },
    @{ name="Clamshells"; category="Lower Limb"; description="Activates and strengthens hip abductors, particularly gluteus medius."; instructions="Lie on your side, hips and knees bent at 45 degrees. Keep feet together, rotate top knee open like a clamshell. Lower slowly."; tags=@("hip","glutes","abductor","pelvis","strengthening") },
    @{ name="Terminal Knee Extension with Band"; category="Lower Limb"; description="Full active extension of the knee against resistance band to strengthen VMO."; instructions="Loop resistance band around a fixed point at knee height. Step into band so it wraps behind your knee. Extend knee from 30 degrees to full extension."; tags=@("knee","VMO","quadriceps","resistance band") },
    @{ name="Hip Abduction Side-lying"; category="Lower Limb"; description="Strengthens hip abductors and external rotators."; instructions="Lie on your side, bottom leg slightly bent for stability. Lift the top leg to about 45 degrees keeping toes pointing forward. Lower slowly."; tags=@("hip","abductor","glutes","strengthening") },
    @{ name="Wall Slides"; category="Lower Limb"; description="Closed-chain quadriceps and glute strengthening exercise."; instructions="Stand with back against wall, feet shoulder-width apart. Slide down to 45-90 degrees of knee flexion. Hold 10 seconds, slide back up."; tags=@("quadriceps","glutes","closed-chain","functional","knee") },
    @{ name="Step-Ups"; category="Lower Limb"; description="Functional lower limb strength exercise using a step."; instructions="Place one foot on a step. Push through the heel to lift your body up. Lower back down with control. Alternate or single leg."; tags=@("functional","quadriceps","glutes","balance","proprioception") },
    @{ name="Single Leg Stance"; category="Balance and Proprioception"; description="Improves balance and proprioception of the ankle and knee."; instructions="Stand near a wall for safety. Shift weight to one leg and lift the other foot off the ground. Focus on a fixed point. Hold 30 seconds."; tags=@("balance","proprioception","ankle","functional") },
    @{ name="BOSU Ball Balance"; category="Balance and Proprioception"; description="Challenges proprioception and neuromuscular control on unstable surface."; instructions="Stand on rounded side of BOSU ball. Balance for 30 seconds maintaining slight knee bend. Progress to eyes closed."; tags=@("balance","proprioception","neuromuscular","advanced") },
    @{ name="Cervical Retraction"; category="Spine"; description="Corrects forward head posture and strengthens deep cervical flexors."; instructions="Sit tall. Without tilting your head, pull your chin straight back creating a double chin. Hold 3 seconds. Release."; tags=@("cervical","neck","posture","deep neck flexors","beginner") },
    @{ name="Cervical Active ROM"; category="Spine"; description="Active range of motion exercises for the cervical spine."; instructions="Perform slow, controlled neck movements: flexion, extension, left/right rotation, left/right lateral flexion. 5 reps each direction."; tags=@("cervical","neck","ROM","mobility") },
    @{ name="Scapular Retraction"; category="Upper Limb"; description="Activates middle trapezius and rhomboids to improve posture."; instructions="Sit or stand tall. Squeeze shoulder blades together as if holding a pencil between them. Hold 5 seconds, release."; tags=@("scapula","trapezius","rhomboids","posture","shoulder") },
    @{ name="Pendulum Exercises"; category="Upper Limb"; description="Gentle gravity-assisted shoulder mobility exercise, typically post-surgery."; instructions="Lean forward supporting yourself with other hand on table. Let injured arm hang freely. Make small circles with the arm using trunk momentum."; tags=@("shoulder","mobility","post-surgery","gentle") },
    @{ name="External Rotation with Band"; category="Upper Limb"; description="Strengthens infraspinatus and teres minor for rotator cuff stability."; instructions="Fix resistance band at elbow height. Elbow at 90 degrees, arm at your side. Rotate forearm outward against the band. Return slowly."; tags=@("shoulder","rotator cuff","external rotation","strengthening","resistance band") },
    @{ name="Wall Push-up"; category="Upper Limb"; description="Beginner level push-up to build shoulder and chest strength."; instructions="Stand arm's length from wall. Place hands on wall at shoulder height. Perform controlled push-up. Progress to incline then floor."; tags=@("shoulder","chest","pectorals","triceps","beginner","functional") },
    @{ name="Thoracic Extension over Foam Roller"; category="Spine"; description="Mobilizes the thoracic spine into extension to improve posture."; instructions="Place foam roller perpendicular to spine at mid-back. Support head with hands. Gently extend over roller. Move roller up and down the thoracic spine."; tags=@("thoracic","spine","mobility","posture","foam roller") },
    @{ name="Cat-Camel Stretch"; category="Spine"; description="Improves spinal mobility and flexibility in both flexion and extension."; instructions="On all fours. Round spine toward ceiling (cat). Then drop belly toward floor and lift head (camel). Alternate slowly."; tags=@("spine","lumbar","thoracic","mobility","flexibility","beginner") },
    @{ name="Pelvic Tilts"; category="Spine"; description="Activates lumbar stabilizers and relieves low back pain."; instructions="Lie on back with knees bent. Flatten lower back against floor by tightening abdominals. Hold 5 seconds, release."; tags=@("lumbar","core","low back","beginner","stabilization") },
    @{ name="Abdominal Bracing"; category="Core"; description="Activates deep core stabilizers (transversus abdominis) for spinal stability."; instructions="Lie on back, knees bent. Breathe in. On exhale, draw belly button toward spine. Hold while breathing normally."; tags=@("core","transversus abdominis","lumbar","stabilization","beginner") },
    @{ name="Dead Bug"; category="Core"; description="Advanced core stability exercise that challenges anti-extension and coordination."; instructions="Lie on back, arms straight up, hips and knees at 90 degrees. Extend opposite arm and leg toward ground while keeping back flat. Alternate sides."; tags=@("core","stability","coordination","lumbar","intermediate") },
    @{ name="Bird Dog"; category="Core"; description="Improves core stability, balance, and spinal neutral position."; instructions="On all fours. Extend one arm forward and opposite leg back simultaneously. Keep hips level. Hold 3-5 seconds. Alternate."; tags=@("core","balance","stability","lumbar","beginner") },
    @{ name="Bridging"; category="Core"; description="Strengthens glutes, hamstrings, and lumbar extensors."; instructions="Lie on back with knees bent feet flat. Push through heels and squeeze glutes to lift hips. Hold at top 3 seconds, lower slowly."; tags=@("glutes","hamstrings","core","lumbar","hip","beginner") },
    @{ name="Prone Plank"; category="Core"; description="Full body isometric core exercise that builds endurance."; instructions="Forearms on ground, elbows under shoulders. Toes on ground. Maintain straight line from head to heels. Breathe normally. Hold 20-60 seconds."; tags=@("core","endurance","isometric","intermediate","full body") }
)

$exerciseIds = @{}
$exCreated = 0

foreach ($ex in $exercises) {
    Write-Host "Creating: $($ex.name) ..." -NoNewline
    $result = Post-Api "$BASE/exercises" $ex
    if ($result -and $result.data -and $result.data.id) {
        $exerciseIds[$ex.name] = $result.data.id
        Write-Host " OK [$($result.data.id.Substring(0,8))]" -ForegroundColor Green
        $exCreated++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

Write-Host "`nCreated $exCreated / $($exercises.Count) exercises" -ForegroundColor Yellow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SEEDING ALGORITHMS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$algorithms = @(
    @{
        name = "Post Total Knee Replacement - Phase 1 (Acute)"
        diagnosis = "Total Knee Replacement"
        description = "Early phase rehabilitation for post-TKR patients (Days 0-14). Focus on pain management, reducing swelling, and restoring early ROM."
        evaluation_steps = @(
            "Assess wound healing and signs of infection",
            "Measure knee ROM (flexion and extension)",
            "Assess quadriceps activation and straight leg raise ability",
            "Evaluate pain level (VAS scale 0-10)",
            "Check for deep vein thrombosis signs (calf tenderness, Homan's sign)"
        )
        treatment_steps = @(
            "Apply ice 15-20 min before exercises to reduce swelling",
            "Perform bed exercises: ankle pumps, quad sets, heel slides",
            "Progress to SLR when adequate quad control is demonstrated",
            "Ambulate with walking aid under supervision",
            "Elevate limb when resting to reduce swelling"
        )
        red_flags = @(
            "Excessive warmth, redness, or discharge from wound",
            "Sudden severe increase in pain",
            "Signs of DVT: calf pain, swelling, warmth",
            "Inability to perform quad set after 3 days",
            "Fever above 38.5 degrees Celsius"
        )
        outcome_measures = "KOOS score, Knee ROM measurements (goal: 0-90 degrees by week 2), Timed Up and Go test, Pain VAS"
        estimated_sessions = 12
        exercises = @(
            @{ name="Ankle Pumps"; phase="Phase 1 - Acute"; sets=3; reps="20"; frequency="4x daily"; notes="Perform in bed" },
            @{ name="Quad Sets"; phase="Phase 1 - Acute"; sets=3; reps="10"; frequency="3x daily"; duration="5 sec hold" },
            @{ name="Heel Slides"; phase="Phase 1 - Acute"; sets=3; reps="10"; frequency="3x daily"; notes="Assist with towel if needed" },
            @{ name="Straight Leg Raise"; phase="Phase 1 - Acute"; sets=3; reps="10"; frequency="2x daily"; notes="Only after adequate quad control" },
            @{ name="Bridging"; phase="Phase 1 - Strengthening"; sets=3; reps="10"; frequency="2x daily"; duration="3 sec hold" }
        )
    },
    @{
        name = "ACL Reconstruction Rehab - Phase 2 (Strengthening)"
        diagnosis = "ACL Reconstruction"
        description = "Intermediate phase ACL rehabilitation (Weeks 6-12 post-op). Focus on restoring full ROM, building quadriceps and hamstring strength, and improving neuromuscular control."
        evaluation_steps = @(
            "Assess knee ROM (goal: full extension, greater than 120 degrees flexion)",
            "Quadriceps strength test - compare to contralateral limb",
            "Single leg squat assessment for quality of movement",
            "Proprioception testing: single leg stance eyes open/closed",
            "Check for effusion (joint swelling)"
        )
        treatment_steps = @(
            "Begin closed chain exercises: wall slides, step-ups",
            "Progress from bilateral to unilateral exercises",
            "Introduce resistance band exercises for hip and knee",
            "Start balance training: single leg stance, BOSU ball",
            "Begin light jogging on treadmill if criteria met (strength >70% contra)"
        )
        red_flags = @(
            "Return of significant joint swelling after exercise",
            "Pain greater than 3/10 during or after exercises",
            "Giving way sensation or feeling of instability",
            "Quadriceps strength less than 70% of contralateral side",
            "Positive Lachman or pivot shift test suggesting re-rupture"
        )
        outcome_measures = "IKDC score, Quad and hamstring strength testing, Single leg hop tests, Star excursion balance test, VAS pain"
        estimated_sessions = 24
        exercises = @(
            @{ name="Wall Slides"; phase="Phase 2 - Strengthening"; sets=3; reps="15"; frequency="Daily"; duration="10 sec hold" },
            @{ name="Step-Ups"; phase="Phase 2 - Strengthening"; sets=3; reps="12"; frequency="Daily"; notes="Use 10cm step initially" },
            @{ name="Terminal Knee Extension with Band"; phase="Phase 2 - Strengthening"; sets=3; reps="15"; frequency="Daily" },
            @{ name="Clamshells"; phase="Phase 2 - Hip Strengthening"; sets=3; reps="15"; frequency="Daily" },
            @{ name="Single Leg Stance"; phase="Phase 2 - Proprioception"; sets=3; reps="1"; frequency="Daily"; duration="30 seconds" },
            @{ name="BOSU Ball Balance"; phase="Phase 2 - Proprioception"; sets=3; reps="1"; frequency="Daily"; duration="30 seconds" }
        )
    },
    @{
        name = "Cervical Radiculopathy - Conservative Management"
        diagnosis = "Cervical Radiculopathy"
        description = "Conservative physiotherapy for cervical nerve root compression with arm symptoms. Focus on pain relief, posture correction, and neural mobility."
        evaluation_steps = @(
            "Cervical AROM assessment in all planes and overpressure",
            "Dermatome and myotome assessment for nerve level identification",
            "Upper limb neurological examination: reflexes, sensation, motor power",
            "Spurling test and distraction test for nerve root involvement",
            "Posture assessment: forward head posture, thoracic kyphosis"
        )
        treatment_steps = @(
            "Patient education on cervical spine anatomy and posture principles",
            "Cervical retraction exercises in supine then progressed to sitting",
            "Gentle cervical AROM in pain-free range",
            "Neural mobilization: neural slider technique for symptom relief",
            "Scapular stabilization exercises to offload cervical spine",
            "Ergonomic advice for workstation and sleep posture"
        )
        red_flags = @(
            "Bilateral arm symptoms or leg symptoms suggesting myelopathy",
            "Bowel or bladder dysfunction - URGENT REFERRAL",
            "Drop attacks or vertebro-basilar symptoms: dizziness, visual changes, dysarthria",
            "Progressive neurological deficit",
            "Signs of infection: fever, night sweats, unexplained weight loss"
        )
        outcome_measures = "Neck Disability Index (NDI), Numerical Pain Rating Scale, Cervical ROM, Patient-Specific Functional Scale"
        estimated_sessions = 10
        exercises = @(
            @{ name="Cervical Retraction"; phase="Phase 1 - Pain Relief"; sets=3; reps="10"; frequency="4x daily"; duration="3 sec hold" },
            @{ name="Cervical Active ROM"; phase="Phase 1 - Mobility"; sets=1; reps="5"; frequency="2x daily"; notes="Stop at pain onset" },
            @{ name="Scapular Retraction"; phase="Phase 2 - Stabilization"; sets=3; reps="10"; frequency="3x daily"; duration="5 sec hold" },
            @{ name="Thoracic Extension over Foam Roller"; phase="Phase 2 - Mobility"; sets=1; reps="5 segments"; frequency="Daily" }
        )
    },
    @{
        name = "Rotator Cuff Tendinopathy - Progressive Loading Program"
        diagnosis = "Rotator Cuff Tendinopathy / Subacromial Pain Syndrome"
        description = "Evidence-based progressive loading program for rotator cuff tendinopathy following load-management principles (Weeks 1-12)."
        evaluation_steps = @(
            "Shoulder AROM and PROM assessment in all planes",
            "Rotator cuff strength testing: internal/external rotation, abduction",
            "Impingement tests: Neer, Hawkins-Kennedy, painful arc",
            "Scapular dyskinesis assessment during arm elevation",
            "Postural assessment: thoracic kyphosis, forward head posture"
        )
        treatment_steps = @(
            "Phase 1 (Weeks 1-2): Isometric exercises and activity modification",
            "Phase 2 (Weeks 3-6): Isotonic exercises and scapular stabilization",
            "Phase 3 (Weeks 7-12): Progressive loading and functional exercises",
            "Manual therapy: glenohumeral joint mobilizations if indicated",
            "Correct faulty movement patterns and address contributing factors"
        )
        red_flags = @(
            "Significant traumatic mechanism suggesting acute full thickness tear",
            "Complete inability to initiate shoulder abduction suggesting massive cuff tear",
            "Night pain preventing sleep for more than 4 weeks consistently",
            "Age over 50 with acute onset and significant loss of PROM (consider calcific tendinopathy)",
            "No improvement after 8 weeks of appropriate physiotherapy"
        )
        outcome_measures = "DASH score, Shoulder Pain and Disability Index (SPADI), Shoulder strength testing, Functional ROM"
        estimated_sessions = 16
        exercises = @(
            @{ name="Scapular Retraction"; phase="Phase 1 - Isometric"; sets=3; reps="10"; frequency="Daily"; duration="5 sec hold" },
            @{ name="Pendulum Exercises"; phase="Phase 1 - Mobility"; sets=3; reps="10 circles each direction"; frequency="Daily"; notes="Use gravity only, no active effort" },
            @{ name="External Rotation with Band"; phase="Phase 2 - Isotonic"; sets=3; reps="15"; frequency="Daily"; notes="Light resistance initially" },
            @{ name="Wall Push-up"; phase="Phase 3 - Functional"; sets=3; reps="15"; frequency="Daily"; notes="Progress to incline then floor" }
        )
    },
    @{
        name = "Non-Specific Low Back Pain - Stabilization Program"
        diagnosis = "Non-Specific Low Back Pain (NSLBP)"
        description = "Evidence-based core stabilization and graded strengthening program for NSLBP. Addresses motor control deficits and builds functional capacity over 6-8 weeks."
        evaluation_steps = @(
            "Lumbar AROM assessment in all planes",
            "Neurological screening: SLR, slump test, myotomes, reflexes",
            "Core muscle activation assessment: ability to perform abdominal bracing",
            "Movement pattern analysis: hip hinge quality, squat mechanics",
            "Identify functional limitations and patient goals",
            "STarT Back Tool for risk stratification"
        )
        treatment_steps = @(
            "Patient education: pain neuroscience, activity pacing, posture",
            "Begin motor control: abdominal bracing and pelvic tilts",
            "Introduce stabilization: dead bug and bird dog",
            "Progress to global strengthening: bridging and plank",
            "Graded exposure to previously feared movements",
            "Aerobic exercise: walking program 20-30 min 3x/week"
        )
        red_flags = @(
            "Cauda equina syndrome: saddle anaesthesia, bilateral leg symptoms, bowel or bladder dysfunction - MEDICAL EMERGENCY",
            "Significant trauma suggesting vertebral fracture",
            "Unexplained weight loss or fever suggesting systemic pathology",
            "History of cancer with new back pain",
            "Progressive neurological deficit",
            "Pain worse at rest and at night suggesting non-mechanical cause"
        )
        outcome_measures = "Oswestry Disability Index (ODI), Numeric Pain Rating Scale, Lumbar ROM, Patient-Specific Functional Scale"
        estimated_sessions = 8
        exercises = @(
            @{ name="Pelvic Tilts"; phase="Phase 1 - Motor Control"; sets=3; reps="10"; frequency="3x daily"; duration="5 sec hold" },
            @{ name="Abdominal Bracing"; phase="Phase 1 - Motor Control"; sets=3; reps="10"; frequency="3x daily"; duration="10 sec hold" },
            @{ name="Cat-Camel Stretch"; phase="Phase 1 - Mobility"; sets=3; reps="10"; frequency="Daily"; notes="Slow and controlled movement" },
            @{ name="Bird Dog"; phase="Phase 2 - Stabilization"; sets=3; reps="10"; frequency="Daily"; duration="5 sec hold" },
            @{ name="Dead Bug"; phase="Phase 2 - Stabilization"; sets=3; reps="8"; frequency="Daily"; notes="Maintain lumbar neutral" },
            @{ name="Bridging"; phase="Phase 3 - Strengthening"; sets=3; reps="15"; frequency="Daily"; duration="3 sec hold at top" },
            @{ name="Prone Plank"; phase="Phase 3 - Strengthening"; sets=3; reps="1"; frequency="Daily"; duration="30 seconds" }
        )
    }
)

$algCreated = 0

foreach ($alg in $algorithms) {
    Write-Host "Creating algorithm: $($alg.name) ..." -NoNewline
    
    # Build exercises array with IDs
    $exWithIds = @()
    $idx = 0
    foreach ($ex in $alg.exercises) {
        $exId = $exerciseIds[$ex.name]
        if ($exId) {
            $entry = @{ exercise_id=$exId; phase=$ex.phase; sets=$ex.sets; reps=$ex.reps; frequency=$ex.frequency; order_index=$idx }
            if ($ex.duration) { $entry.duration = $ex.duration }
            if ($ex.notes)    { $entry.notes    = $ex.notes }
            $exWithIds += $entry
            $idx++
        } else {
            Write-Host "`n  WARNING: Exercise '$($ex.name)' not found in map" -ForegroundColor Yellow
        }
    }
    
    $body = @{
        name               = $alg.name
        diagnosis          = $alg.diagnosis
        description        = $alg.description
        evaluation_steps   = $alg.evaluation_steps
        treatment_steps    = $alg.treatment_steps
        red_flags          = $alg.red_flags
        outcome_measures   = $alg.outcome_measures
        estimated_sessions = $alg.estimated_sessions
        exercises          = $exWithIds
    }
    
    $result = Post-Api "$BASE/algorithms" $body
    if ($result -and $result.data -and $result.data.id) {
        Write-Host " OK [$($result.data.id.Substring(0,8)), $($exWithIds.Count) exercises linked]" -ForegroundColor Green
        $algCreated++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        if ($result) { Write-Host "  Response: $($result | ConvertTo-Json -Depth 3)" -ForegroundColor DarkRed }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Exercises created : $exCreated / $($exercises.Count)" -ForegroundColor $(if ($exCreated -eq $exercises.Count) {"Green"} else {"Yellow"})
Write-Host "Algorithms created: $algCreated / $($algorithms.Count)" -ForegroundColor $(if ($algCreated -eq $algorithms.Count) {"Green"} else {"Yellow"})
